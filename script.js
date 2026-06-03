// Configuration Pusher (remplacez par vos vraies clés)
const PUSHER_APP_KEY = 'a9a2ffd71fbd48c4fb0a';
const PUSHER_CLUSTER = 'mt1';

// Initialisation
let currentUser = null;
let currentChatUser = null;
let pusher = null;
let channel = null;
let users = [];
let messages = {};

// Charger les utilisateurs depuis localStorage
function loadUsers() {
    const storedUsers = localStorage.getItem('chat_users');
    if (storedUsers) {
        users = JSON.parse(storedUsers);
    } else {
        // Utilisateurs par défaut
        users = [
            { id: 1, name: 'Jean Dupont', online: false },
            { id: 2, name: 'Marie Martin', online: false },
            { id: 3, name: 'Pierre Durand', online: false },
            { id: 4, name: 'Sophie Bernard', online: false }
        ];
        saveUsers();
    }
}

function saveUsers() {
    localStorage.setItem('chat_users', JSON.stringify(users));
}

// Sauvegarder les messages
function saveMessages() {
    localStorage.setItem(`messages_${currentUser.id}`, JSON.stringify(messages));
}

function loadMessages() {
    const storedMessages = localStorage.getItem(`messages_${currentUser.id}`);
    if (storedMessages) {
        messages = JSON.parse(storedMessages);
    } else {
        messages = {};
    }
}

// Ajouter un message
function addMessage(receiverId, message, isSent) {
    if (!messages[receiverId]) {
        messages[receiverId] = [];
    }
    
    const newMessage = {
        id: Date.now(),
        text: message,
        senderId: isSent ? currentUser.id : receiverId,
        receiverId: isSent ? receiverId : currentUser.id,
        timestamp: new Date(),
        read: false
    };
    
    messages[receiverId].push(newMessage);
    saveMessages();
    
    if (currentChatUser && currentChatUser.id == receiverId) {
        displayMessages(receiverId);
    }
    
    return newMessage;
}

// Afficher les messages
function displayMessages(userId) {
    const messagesArea = document.getElementById('messagesArea');
    if (!messagesArea) return;
    
    const userMessages = messages[userId] || [];
    messagesArea.innerHTML = '';
    
    if (userMessages.length === 0) {
        messagesArea.innerHTML = '<div class="welcome-message"><i class="fas fa-comment-dots"></i><p>Dites bonjour ! 👋</p></div>';
        return;
    }
    
    userMessages.forEach(msg => {
        const isSent = msg.senderId === currentUser.id;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${isSent ? 'sent' : 'received'}`;
        messageDiv.innerHTML = `
            <div class="message-bubble">
                ${escapeHtml(msg.text)}
                <div class="message-time">
                    ${new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    ${isSent ? (msg.read ? '✓✓' : '✓') : ''}
                </div>
            </div>
        `;
        messagesArea.appendChild(messageDiv);
    });
    
    scrollToBottom();
}

// Envoyer un message via Pusher
function sendMessageViaPusher(receiverId, message) {
    if (!pusher || !channel) return;
    
    const messageData = {
        id: Date.now(),
        text: message,
        senderId: currentUser.id,
        senderName: currentUser.name,
        receiverId: receiverId,
        timestamp: new Date().toISOString()
    };
    
    // Trigger l'événement Pusher
    channel.trigger('client-message-sent', messageData);
    
    // Ajouter le message localement
    addMessage(receiverId, message, true);
}

// Écouter les messages Pusher
function listenForMessages() {
    if (!pusher || !channel) return;
    
    channel.bind('client-message-sent', function(data) {
        if (data.receiverId === currentUser.id) {
            // Message pour nous
            addMessage(data.senderId, data.text, false);
            
            // Mettre à jour l'interface
            if (currentChatUser && currentChatUser.id === data.senderId) {
                displayMessages(data.senderId);
            }
            
            // Notification
            showNotification(`${data.senderName}: ${data.text}`);
            
            // Marquer comme lu si la conversation est ouverte
            if (currentChatUser && currentChatUser.id === data.senderId) {
                markMessagesAsRead(data.senderId);
            }
        }
    });
    
    channel.bind('client-typing', function(data) {
        if (data.senderId === currentChatUser?.id) {
            const typingStatus = document.getElementById('typingStatus');
            if (data.isTyping) {
                typingStatus.innerHTML = `${data.senderName} écrit...`;
            } else {
                typingStatus.innerHTML = '';
            }
        }
    });
}

// Marquer les messages comme lus
function markMessagesAsRead(userId) {
    if (messages[userId]) {
        messages[userId].forEach(msg => {
            if (msg.receiverId === currentUser.id && !msg.read) {
                msg.read = true;
            }
        });
        saveMessages();
        displayMessages(userId);
    }
}

// Indicateur de frappe
let typingTimeout;
function sendTypingIndicator(isTyping) {
    if (!currentChatUser || !channel) return;
    
    channel.trigger('client-typing', {
        senderId: currentUser.id,
        senderName: currentUser.name,
        isTyping: isTyping
    });
}

// Afficher les utilisateurs dans la sidebar
function displayUsers() {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;
    
    usersList.innerHTML = '';
    
    // Filtrer l'utilisateur courant
    const otherUsers = users.filter(u => u.id !== currentUser.id);
    
    otherUsers.forEach(user => {
        const unreadCount = getUnreadCount(user.id);
        
        const userDiv = document.createElement('div');
        userDiv.className = `user-item ${currentChatUser && currentChatUser.id === user.id ? 'active' : ''}`;
        userDiv.onclick = () => selectUser(user);
        userDiv.innerHTML = `
            <div class="user-avatar">
                ${user.name.charAt(0).toUpperCase()}
            </div>
            <div class="user-info">
                <div class="user-name">
                    ${escapeHtml(user.name)}
                    ${user.online ? '<span class="online-dot"></span>' : ''}
                </div>
                <div class="user-status">
                    ${user.online ? 'En ligne' : 'Hors ligne'}
                </div>
            </div>
            ${unreadCount > 0 ? `<div class="unread-badge">${unreadCount}</div>` : ''}
        `;
        usersList.appendChild(userDiv);
    });
}

// Compter les messages non lus
function getUnreadCount(userId) {
    if (!messages[userId]) return 0;
    return messages[userId].filter(msg => msg.receiverId === currentUser.id && !msg.read).length;
}

// Sélectionner un utilisateur
function selectUser(user) {
    currentChatUser = user;
    
    // Marquer comme lus
    markMessagesAsRead(user.id);
    
    // Mettre à jour l'interface
    document.getElementById('chatWithUser').innerHTML = `<i class="fas fa-user-circle"></i> ${user.name}`;
    document.getElementById('chatInputArea').style.display = 'block';
    
    displayMessages(user.id);
    displayUsers();
}

// Envoyer un message
function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message || !currentChatUser) return;
    
    sendMessageViaPusher(currentChatUser.id, message);
    input.value = '';
}

// Notification
function showNotification(message) {
    if (Notification.permission === 'granted') {
        new Notification('Nouveau message', { body: message });
    }
}

// Utilitaires
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    const messagesArea = document.getElementById('messagesArea');
    if (messagesArea) {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }
}

// Initialiser Pusher
function initPusher() {
    pusher = new Pusher(PUSHER_APP_KEY, {
        cluster: PUSHER_CLUSTER,
        forceTLS: true
    });
    
    channel = pusher.subscribe(`private-user-${currentUser.id}`);
    listenForMessages();
}

// Page de connexion
if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            
            if (username) {
                // Créer ou récupérer l'utilisateur
                loadUsers();
                let user = users.find(u => u.name === username);
                
                if (!user) {
                    user = {
                        id: Date.now(),
                        name: username,
                        online: true
                    };
                    users.push(user);
                    saveUsers();
                } else {
                    user.online = true;
                    saveUsers();
                }
                
                currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                window.location.href = 'chat.html';
            }
        });
    }
}

// Page de chat
if (window.location.pathname.includes('chat.html')) {
    // Récupérer l'utilisateur courant
    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = JSON.parse(storedUser);
    document.getElementById('currentUserName').innerHTML = `<i class="fas fa-user"></i> ${currentUser.name}`;
    
    // Demander la permission pour les notifications
    if (Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
    
    // Charger les données
    loadUsers();
    loadMessages();
    displayUsers();
    
    // Initialiser Pusher
    initPusher();
    
    // Gérer l'envoi de message
    const sendBtn = document.getElementById('sendBtn');
    const messageInput = document.getElementById('messageInput');
    
    if (sendBtn) {
        sendBtn.onclick = sendMessage;
    }
    
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        
        messageInput.addEventListener('input', () => {
            sendTypingIndicator(true);
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                sendTypingIndicator(false);
            }, 1000);
        });
    }
    
    // Déconnexion
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            currentUser.online = false;
            saveUsers();
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        };
    }
    
    // Rafraîchir la liste des utilisateurs périodiquement
    setInterval(() => {
        displayUsers();
    }, 5000);
}

// Mettre à jour le statut en ligne à la fermeture
window.addEventListener('beforeunload', () => {
    if (currentUser) {
        currentUser.online = false;
        saveUsers();
    }
});