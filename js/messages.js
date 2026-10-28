// ===== MESSAGES MODULE =====
const messages = {
  currentChatId: null,

  loadMessages(chatId) {
    if (!chatId) return;
    
    this.currentChatId = chatId;
    const container = document.getElementById('messages-container');
    if (!container) return;

    container.innerHTML = '';

    const chatMessages = storage.getChatMessages(chatId);
    const user = storage.getCurrentUser();
    if (!user) return;

    chatMessages.reverse().forEach((msg) => {
      this.addMessageToUI(msg, user);
    });

    this.scrollToBottom();
    
    // Привязываем события скролла только один раз
    if (!this.scrollEventsBound) {
      setTimeout(() => {
        this.bindScrollEvents();
        this.scrollEventsBound = true;
        console.log('Scroll events bound');
      }, 100);
    }
    
    // Сохраняем состояние
    ui.saveState();
  },

  addMessageToUI(msg, currentUser) {
    const container = document.getElementById('messages-container');
    if (!container) return;

    const isOwn = msg.senderId === currentUser.id;
    const sender = storage.users.find(u => u.id === msg.senderId);
    
    if (!sender) return;

    const div = document.createElement('div');
    div.className = `message ${isOwn ? 'own' : ''}`;

    const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) : '';

    let avatarContent;
    if (sender.avatarImage) {
      avatarContent = `<img src="${sender.avatarImage}" alt="Avatar">`;
    } else {
      avatarContent = sender.displayName.charAt(0).toUpperCase();
    }

    div.innerHTML = `
      <div class="message-avatar" style="background: ${sender.avatarColor || '#5865F2'}">
        ${avatarContent}
      </div>
      <div class="message-content">
        ${!isOwn ? `<div class="message-header"><span class="message-author" style="color: ${sender.avatarColor || '#5865F2'}">${ui.escapeHtml(sender.displayName)}</span><span class="message-time">${time}</span></div>` : ''}
        <div class="message-text">${ui.escapeHtml(msg.text)}</div>
        ${isOwn ? `<div class="message-header" style="justify-content: flex-end;"><span class="message-time">${time}</span></div>` : ''}
      </div>
    `;

    container.appendChild(div);
  },

  send() {
    if (!this.currentChatId) return;

    const input = document.getElementById('message-input');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    const user = storage.getCurrentUser();
    if (!user) return;

    // Сохраняем текущую позицию скролла
    const container = document.getElementById('messages-container');
    const previousScrollHeight = container ? container.scrollHeight : 0;
    const previousScrollTop = container ? container.scrollTop : 0;

    const message = storage.sendMessage(this.currentChatId, user.id, text);
    if (message) {
      input.value = '';
      this.addMessageToUI({
        id: 'temp',
        senderId: user.id,
        text: text,
        timestamp: new Date().toISOString()
      }, user);

      // Восстанавливаем позицию скролла
      if (container) {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = previousScrollTop + (newScrollHeight - previousScrollHeight);
      }

      chatManager.renderChatList();
      
      // Сохраняем состояние
      ui.saveState();
    }
  },

  scrollToBottom() {
    const container = document.getElementById('messages-container');
    if (!container) return;
    
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 100);
  },

  bindScrollEvents() {
    const container = document.getElementById('messages-container');
    const scrollToBottomBtn = document.getElementById('scroll-to-bottom');
    if (!container) return;

    let isNearBottom = true;
    let scrollTimeout;

    const onScroll = function() {
      clearTimeout(scrollTimeout);
      
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      
      console.log('Scroll:', { scrollTop, scrollHeight, clientHeight });
      
      // Проверяем близость к низу (порог 100px)
      isNearBottom = (scrollHeight - scrollTop - clientHeight) < 100;
      
      // Показываем/скрываем кнопку "Вниз"
      if (scrollToBottomBtn) {
        if (!isNearBottom) {
          scrollToBottomBtn.classList.add('show');
          console.log('Show scroll button');
        } else {
          scrollToBottomBtn.classList.remove('show');
        }
      }
      
      // Загружаем старые сообщения при прокрутке вверх
      scrollTimeout = setTimeout(() => {
        if (scrollTop < 50 && !container.dataset.loading) {
          container.dataset.loading = 'true';
          this.loadOlderMessages(container);
        }
      }, 200);
    };

    // Используем setTimeout для гарантии что контейнер виден
    setTimeout(() => {
      container.addEventListener('scroll', onScroll);
      console.log('Scroll event listener added');
    }, 200);

    // Обработчик кнопки "Вниз"
    if (scrollToBottomBtn) {
      scrollToBottomBtn.addEventListener('click', () => {
        this.scrollToBottom();
        scrollToBottomBtn.classList.remove('show');
      });
    }
  },

  loadOlderMessages(container) {
    if (!this.currentChatId) return;
    
    const currentMessages = storage.getChatMessages(this.currentChatId, 50);
    if (currentMessages.length === 0) return;
    
    const oldestMessage = currentMessages[currentMessages.length - 1];
    const beforeId = oldestMessage.id;
    
    // Загружаем больше сообщений
    const moreMessages = storage.getChatMessages(this.currentChatId, 100);
    const olderMessages = moreMessages.filter(m => m.id !== beforeId && !currentMessages.find(cm => cm.id === m.id));
    
    if (olderMessages.length === 0) {
      container.dataset.loading = 'false';
      return;
    }
    
    // Сохраняем текущую высоту
    const previousHeight = container.scrollHeight;
    const previousScrollTop = container.scrollTop;
    
    // Добавляем старые сообщения в начало
    olderMessages.reverse().forEach((msg) => {
      const user = storage.getCurrentUser();
      if (user) {
        this.addMessageToUI(msg, user);
      }
    });
    
    // Восстанавливаем позицию скролла
    const newHeight = container.scrollHeight;
    container.scrollTop = previousScrollTop + (newHeight - previousHeight);
    
    container.dataset.loading = 'false';
  }
};
