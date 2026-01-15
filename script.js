'use strict';

// ========== SMART CONTACTS APP - TEAM EDITION 2026 ==========
class SmartContactsApp {
    constructor() {
        // Configuration
        this.config = {
            APP_VERSION: '3.0.2026',
            BUILD_TYPE: 'PRO-TEAM',
            DEFAULT_PASSWORD: '606020', // Change this for production
            DATA_SOURCE: 'https://thunderpa3d.github.io/teest/CONTACTS.xlsx',
            SYNC_INTERVAL: 300000, // 5 minutes
            CACHE_DURATION: 3600000, // 1 hour
            MAX_CONTACTS: 1000,
            TEAM_NAME: 'THNDER Team'
        };
        
        // Application State
        this.state = {
            authenticated: false,
            contacts: [],
            filteredContacts: [],
            favorites: new Set(),
            searchQuery: '',
            currentSort: 'name',
            currentFilter: 'all',
            lastSync: null,
            isOnline: navigator.onLine,
            isSyncing: false,
            lastScrollY: 0,
            headerVisible: true
        };
        
        // DOM Elements Cache
        this.elements = {};
        
        // Initialize
        this.init();
    }
    
    // ========== INITIALIZATION ==========
    init() {
        this.cacheElements();
        this.bindEvents();
        this.checkAuth();
        this.setupServiceWorker();
        this.setupTouchGestures();
    }
    
    cacheElements() {
        // Auth Screen
        this.elements.authScreen = document.getElementById('auth-screen');
        this.elements.appContainer = document.getElementById('app-container');
        this.elements.passwordInput = document.getElementById('password-input');
        this.elements.togglePassword = document.getElementById('toggle-password');
        this.elements.authSubmit = document.getElementById('auth-submit');
        this.elements.authMessage = document.getElementById('auth-message');
        
        // Header & Navigation
        this.elements.mainHeader = document.getElementById('main-header');
        this.elements.searchSection = document.getElementById('search-section');
        this.elements.searchInput = document.getElementById('search-input');
        this.elements.searchClear = document.getElementById('search-clear');
        this.elements.searchToggle = document.getElementById('search-toggle');
        this.elements.voiceSearch = document.getElementById('voice-search');
        this.elements.sortBtn = document.getElementById('sort-btn');
        this.elements.sortModal = document.getElementById('sort-modal');
        this.elements.modalClose = document.querySelector('.modal-close');
        this.elements.manualSync = document.getElementById('manual-sync');
        this.elements.logoutBtn = document.getElementById('logout-btn');
        this.elements.refreshData = document.getElementById('refresh-data');
        
        // Content Areas
        this.elements.contactsList = document.getElementById('contacts-list');
        this.elements.appMain = document.getElementById('app-main');
        this.elements.loadingOverlay = document.getElementById('loading-overlay');
        this.elements.loadingText = document.getElementById('loading-text');
        this.elements.notificationCenter = document.getElementById('notification-center');
        
        // Statistics
        this.elements.totalContacts = document.getElementById('total-contacts');
        this.elements.totalWhatsapp = document.getElementById('total-whatsapp');
        this.elements.totalTelegram = document.getElementById('total-telegram');
        this.elements.dataSource = document.getElementById('data-source');
        this.elements.syncBadge = document.getElementById('sync-badge');
        
        // Quick Actions
        this.elements.quickActions = document.querySelector('.quick-actions');
        this.elements.bottomNav = document.querySelector('.bottom-nav');
    }
    
    bindEvents() {
        // Authentication Events
        this.elements.authSubmit.addEventListener('click', (e) => this.handleAuth(e));
        this.elements.togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
        this.elements.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleAuth(e);
        });
        this.elements.logoutBtn.addEventListener('click', () => this.handleLogout());
        
        // Search & Filter Events
        this.elements.searchInput.addEventListener('input', 
            this.debounce(() => this.handleSearch(), 300)
        );
        this.elements.searchClear.addEventListener('click', () => this.clearSearch());
        this.elements.searchToggle.addEventListener('click', () => this.toggleSearch());
        this.elements.voiceSearch.addEventListener('click', () => this.startVoiceSearch());
        
        // Filter Buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilter(e));
        });
        
        // Sort Events
        this.elements.sortBtn.addEventListener('click', () => this.showSortModal());
        this.elements.modalClose.addEventListener('click', () => this.hideSortModal());
        document.querySelectorAll('.sort-option').forEach(option => {
            option.addEventListener('click', (e) => this.handleSort(e));
        });
        
        // Sync Events
        this.elements.manualSync.addEventListener('click', () => this.syncData(true));
        this.elements.refreshData.addEventListener('click', () => this.syncData(true));
        
        // Navigation Events
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleNavigation(e));
        });
        
        // Quick Actions
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleQuickAction(e));
        });
        
        // Scroll Events for Header Hide/Show
        window.addEventListener('scroll', 
            this.throttle(() => this.handleScroll(), 100)
        );
        
        // Network Events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Touch Gestures
        this.setupTouchGestures();
    }
    
    // ========== AUTHENTICATION ==========
    checkAuth() {
        const authToken = localStorage.getItem('teamContacts_auth');
        const authTime = localStorage.getItem('teamContacts_auth_time');
        
        if (authToken && authTime) {
            const timeDiff = Date.now() - parseInt(authTime);
            // Auto-logout after 24 hours for security
            if (timeDiff < 24 * 60 * 60 * 1000) {
                this.state.authenticated = true;
                this.showApp();
                this.loadAppData();
                return;
            }
        }
        
        this.showAuth();
    }
    
    handleAuth(e) {
        e.preventDefault();
        const password = this.elements.passwordInput.value.trim();
        
        if (!password) {
            this.showAuthMessage('يرجى إدخال كلمة المرور', 'error');
            return;
        }
        
        // Professional password validation
        if (password === this.config.DEFAULT_PASSWORD) {
            this.state.authenticated = true;
            localStorage.setItem('teamContacts_auth', 'true');
            localStorage.setItem('teamContacts_auth_time', Date.now().toString());
            
            this.showAuthMessage('تم المصادقة بنجاح | فريق العمل', 'success');
            
            setTimeout(() => {
                this.showApp();
                this.loadAppData();
            }, 1000);
            
        } else {
            this.showAuthMessage('كلمة المرور غير صحيحة', 'error');
            this.elements.passwordInput.value = '';
            this.elements.passwordInput.classList.add('shake');
            setTimeout(() => {
                this.elements.passwordInput.classList.remove('shake');
            }, 500);
        }
    }
    
    togglePasswordVisibility() {
        const type = this.elements.passwordInput.type;
        this.elements.passwordInput.type = type === 'password' ? 'text' : 'password';
        this.elements.togglePassword.innerHTML = type === 'password' ? 
            '<i class="fas fa-eye-slash"></i>' : 
            '<i class="fas fa-eye"></i>';
    }
    
    handleLogout() {
        if (confirm('هل تريد تسجيل الخروج من منصة فريق العمل؟')) {
            this.state.authenticated = false;
            localStorage.removeItem('teamContacts_auth');
            localStorage.removeItem('teamContacts_auth_time');
            this.showAuth();
            this.showNotification('تم تسجيل الخروج الآمن', 'info');
        }
    }
    
    // ========== APP DISPLAY ==========
    showAuth() {
        this.elements.authScreen.style.display = 'flex';
        this.elements.appContainer.style.display = 'none';
        this.elements.passwordInput.focus();
    }
    
    showApp() {
        this.elements.authScreen.style.display = 'none';
        this.elements.appContainer.style.display = 'block';
        this.initializeApp();
    }
    
    // ========== DATA MANAGEMENT ==========
    async loadAppData() {
        this.showLoading('جاري تحميل بيانات فريق العمل...');
        
        try {
            // Try to load from cache first
            await this.loadFromCache();
            
            // If no cache or cache expired, sync from source
            if (this.state.contacts.length === 0 || this.shouldSync()) {
                await this.syncData();
            }
            
            this.updateUI();
            this.hideLoading();
            
        } catch (error) {
            console.error('Error loading app data:', error);
            this.showNotification('خطأ في تحميل البيانات', 'error');
            this.hideLoading();
        }
    }
    
    async loadFromCache() {
        try {
            const cached = localStorage.getItem('teamContacts_data');
            const cacheTime = localStorage.getItem('teamContacts_cache_time');
            
            if (cached && cacheTime) {
                const age = Date.now() - parseInt(cacheTime);
                
                if (age < this.config.CACHE_DURATION) {
                    const data = JSON.parse(cached);
                    this.state.contacts = data.contacts || [];
                    this.state.filteredContacts = [...this.state.contacts];
                    this.state.lastSync = data.lastSync || null;
                    
                    console.log(`Loaded ${this.state.contacts.length} contacts from cache`);
                    return true;
                }
            }
        } catch (error) {
            console.warn('Cache load error:', error);
        }
        
        return false;
    }
    
    async syncData(force = false) {
        if (this.state.isSyncing && !force) return;
        if (!this.state.isOnline) {
            this.showNotification('غير متصل بالإنترنت', 'warning');
            return;
        }
        
        this.state.isSyncing = true;
        this.showLoading('جاري مزامنة بيانات الفريق...');
        
        try {
            const data = await this.fetchExcelData();
            const contacts = this.processExcelData(data);
            
            if (contacts.length > 0) {
                this.state.contacts = contacts.slice(0, this.config.MAX_CONTACTS);
                this.state.filteredContacts = [...this.state.contacts];
                this.state.lastSync = new Date().toISOString();
                
                this.saveToCache();
                this.updateUI();
                
                this.showNotification(`تم مزامنة ${contacts.length} جهة اتصال`, 'success');
            } else {
                this.showNotification('لا توجد بيانات جديدة', 'warning');
            }
            
        } catch (error) {
            console.error('Sync error:', error);
            this.showNotification('فشلت المزامنة', 'error');
            this.elements.syncBadge.textContent = '!';
            
        } finally {
            this.state.isSyncing = false;
            this.hideLoading();
        }
    }
    
    async fetchExcelData() {
        try {
            const response = await fetch(this.config.DATA_SOURCE, {
                headers: { 'Cache-Control': 'no-cache' },
                signal: AbortSignal.timeout(15000)
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const arrayBuffer = await response.arrayBuffer();
            return XLSX.read(arrayBuffer, { type: 'array' });
            
        } catch (error) {
            throw new Error(`فشل تحميل البيانات: ${error.message}`);
        }
    }
    
    processExcelData(workbook) {
        const contacts = [];
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        console.log('Processing Excel data:', jsonData.length, 'rows');
        
        jsonData.forEach((row, index) => {
            try {
                const contact = this.extractContactFromRow(row);
                if (contact) contacts.push(contact);
            } catch (error) {
                console.warn(`Error processing row ${index}:`, error);
            }
        });
        
        return contacts;
    }
    
    extractContactFromRow(row) {
        // Flexible column name matching
        const getValue = (keys) => {
            for (const key of keys) {
                const value = row[key];
                if (value !== undefined && value !== null && value !== '') {
                    return String(value).trim();
                }
            }
            return '';
        };
        
        const name = getValue(['الاسم', 'اسم', 'Name', 'name']);
        const lastName = getValue(['اللقب', 'لقب', 'Last Name', 'lastName']);
        const phone = getValue(['رقم الهاتف', 'هاتف', 'Phone', 'phone']);
        const whatsapp = getValue(['رقم الواتساب', 'واتساب', 'WhatsApp', 'whatsapp']);
        const telegram = getValue(['حساب التليجرام', 'تليجرام', 'Telegram', 'telegram']);
        const address = getValue(['العنوان', 'عنوان', 'Address', 'address']);
        
        // Skip rows without essential data
        if (!name && !phone && !whatsapp && !telegram) return null;
        
        return {
            id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: name || 'عضو فريق',
            lastName: lastName,
            phone: this.cleanPhone(phone),
            whatsapp: this.cleanPhone(whatsapp),
            telegram: this.cleanTelegram(telegram),
            address: address,
            category: this.detectCategory(name, address),
            team: this.config.TEAM_NAME,
            lastContact: null,
            notes: '',
            createdAt: new Date().toISOString(),
            avatarColor: this.getAvatarColor(name)
        };
    }
    
    cleanPhone(phone) {
        if (!phone) return '';
        let cleaned = phone.toString().replace(/\D/g, '');
        
        // Handle Syrian numbers
        if (cleaned.startsWith('00963')) cleaned = '+963' + cleaned.substring(5);
        else if (cleaned.startsWith('963')) cleaned = '+' + cleaned;
        else if (cleaned.startsWith('0')) cleaned = '+963' + cleaned.substring(1);
        else if (cleaned.length === 9 && cleaned.startsWith('9')) cleaned = '+963' + cleaned;
        
        return cleaned.length >= 10 ? cleaned : '';
    }
    
    cleanTelegram(username) {
        if (!username) return '';
        return username.toString()
            .replace(/^@+/, '')
            .replace(/\s+/g, '')
            .replace(/[^a-zA-Z0-9_]/g, '')
            .trim();
    }
    
    detectCategory(name, address) {
        if (!name) return 'فريق';
        
        const text = (name + ' ' + address).toLowerCase();
        const categories = {
            'إدارة': ['مدير', 'رئيس', 'مديرة', 'رئيسة'],
            'تطوير': ['مطور', 'مهندس', 'مبرمج', 'مصمم'],
            'مبيعات': ['مبيعات', 'تسويق', 'تجاري'],
            'دعم': ['دعم', 'خدمة', 'مشرف']
        };
        
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return category;
            }
        }
        
        return 'فريق';
    }
    
    getAvatarColor(name) {
        if (!name) return '#2563eb';
        const colors = [
            '#2563eb', '#7c3aed', '#0d9488', '#f59e0b',
            '#10b981', '#f43f5e', '#8b5cf6', '#ec4899'
        ];
        const index = name.charCodeAt(0) % colors.length;
        return colors[index];
    }
    
    saveToCache() {
        try {
            const data = {
                contacts: this.state.contacts,
                lastSync: this.state.lastSync,
                version: this.config.APP_VERSION
            };
            
            localStorage.setItem('teamContacts_data', JSON.stringify(data));
            localStorage.setItem('teamContacts_cache_time', Date.now().toString());
        } catch (error) {
            console.error('Cache save error:', error);
        }
    }
    
    shouldSync() {
        if (!this.state.lastSync) return true;
        const age = Date.now() - new Date(this.state.lastSync).getTime();
        return age > this.config.SYNC_INTERVAL;
    }
    
    // ========== UI UPDATES ==========
    updateUI() {
        this.updateStats();
        this.renderContacts();
        this.updateDataSourceInfo();
    }
    
    updateStats() {
        const total = this.state.contacts.length;
        const whatsapp = this.state.contacts.filter(c => c.whatsapp).length;
        const telegram = this.state.contacts.filter(c => c.telegram).length;
        
        this.elements.totalContacts.textContent = total;
        this.elements.totalWhatsapp.textContent = whatsapp;
        this.elements.totalTelegram.textContent = telegram;
    }
    
    renderContacts() {
        if (!this.state.filteredContacts.length) {
            this.renderEmptyState();
            return;
        }
        
        const contactsHTML = this.state.filteredContacts.map(contact => 
            this.createContactCard(contact)
        ).join('');
        
        this.elements.contactsList.innerHTML = contactsHTML;
        this.attachContactEvents();
    }
    
    createContactCard(contact) {
        const fullName = `${contact.name} ${contact.lastName || ''}`.trim();
        const firstLetter = contact.name?.charAt(0)?.toUpperCase() || 'T';
        
        return `
            <div class="contact-card" data-id="${contact.id}">
                <div class="contact-header">
                    <div class="contact-avatar" style="background: ${contact.avatarColor}">
                        ${firstLetter}
                    </div>
                    <div class="contact-info">
                        <h3 class="contact-name">
                            ${this.escapeHTML(fullName)}
                            <span class="contact-category">${contact.category}</span>
                        </h3>
                    </div>
                </div>
                
                <div class="contact-details">
                    ${contact.phone ? `
                        <div class="contact-detail">
                            <i class="fas fa-phone"></i>
                            <span>${contact.phone}</span>
                        </div>
                    ` : ''}
                    
                    ${contact.whatsapp ? `
                        <div class="contact-detail">
                            <i class="fab fa-whatsapp"></i>
                            <span>${contact.whatsapp}</span>
                        </div>
                    ` : ''}
                    
                    ${contact.telegram ? `
                        <div class="contact-detail">
                            <i class="fab fa-telegram"></i>
                            <span>${contact.telegram}</span>
                        </div>
                    ` : ''}
                    
                    ${contact.address ? `
                        <div class="contact-detail">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${this.escapeHTML(contact.address)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="contact-actions">
                    ${contact.phone ? `
                        <button class="contact-action-btn call" 
                                data-phone="${contact.phone}"
                                data-name="${this.escapeHTML(fullName)}">
                            <i class="fas fa-phone"></i>
                            <span>اتصال</span>
                        </button>
                    ` : ''}
                    
                    ${contact.whatsapp ? `
                        <button class="contact-action-btn whatsapp" 
                                data-whatsapp="${contact.whatsapp}"
                                data-name="${this.escapeHTML(fullName)}">
                            <i class="fab fa-whatsapp"></i>
                            <span>واتساب</span>
                        </button>
                    ` : ''}
                    
                    ${contact.telegram ? `
                        <button class="contact-action-btn telegram" 
                                data-telegram="${contact.telegram}"
                                data-name="${this.escapeHTML(fullName)}">
                            <i class="fab fa-telegram"></i>
                            <span>تليجرام</span>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    renderEmptyState() {
        const hasSearch = this.state.searchQuery;
        const hasContacts = this.state.contacts.length > 0;
        
        let message, icon, action;
        
        if (hasSearch) {
            message = 'لا توجد نتائج تطابق بحثك';
            icon = 'fa-search';
        } else if (hasContacts) {
            message = `تم تحميل ${this.state.contacts.length} جهة اتصال`;
            icon = 'fa-users';
            action = `
                <button onclick="window.smartContacts.syncData(true)" class="btn-primary">
                    <i class="fas fa-sync"></i> تحديث البيانات
                </button>
            `;
        } else {
            message = 'مرحباً بفريق العمل';
            icon = 'fa-user-tie';
            action = `
                <div style="margin-top: 20px;">
                    <button onclick="window.smartContacts.syncData(true)" class="btn-primary">
                        <i class="fas fa-cloud-download-alt"></i> جلب بيانات الفريق
                    </button>
                </div>
            `;
        }
        
        this.elements.contactsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <h3>${message}</h3>
                ${action || ''}
            </div>
        `;
    }
    
    attachContactEvents() {
        // Phone Call
        document.querySelectorAll('.contact-action-btn.call').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const phone = e.currentTarget.dataset.phone;
                const name = e.currentTarget.dataset.name;
                this.makeCall(phone, name);
            });
        });
        
        // WhatsApp
        document.querySelectorAll('.contact-action-btn.whatsapp').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const whatsapp = e.currentTarget.dataset.whatsapp;
                const name = e.currentTarget.dataset.name;
                this.openWhatsApp(whatsapp, name);
            });
        });
        
        // Telegram
        document.querySelectorAll('.contact-action-btn.telegram').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const telegram = e.currentTarget.dataset.telegram;
                const name = e.currentTarget.dataset.name;
                this.openTelegram(telegram, name);
            });
        });
    }
    
    // ========== QUICK ACTIONS ==========
    makeCall(phone, name) {
        if (!phone) return;
        
        const cleanPhone = phone.replace(/\D/g, '');
        const telLink = `tel:${cleanPhone}`;
        
        // Show confirmation for expensive calls
        if (cleanPhone.startsWith('00') || cleanPhone.startsWith('+')) {
            if (confirm(`الاتصال بـ ${name}؟\n${phone}`)) {
                window.location.href = telLink;
                this.logAction('call', phone, name);
            }
        } else {
            window.location.href = telLink;
            this.logAction('call', phone, name);
        }
    }
    
    openWhatsApp(whatsapp, name) {
        if (!whatsapp) return;
        
        const cleanNumber = whatsapp.replace(/\D/g, '');
        const whatsappLink = `https://wa.me/${cleanNumber}`;
        
        if (confirm(`فتح واتساب مع ${name}؟`)) {
            window.open(whatsappLink, '_blank');
            this.logAction('whatsapp', whatsapp, name);
        }
    }
    
    openTelegram(telegram, name) {
        if (!telegram) return;
        
        const cleanUsername = telegram.replace('@', '');
        const telegramLink = `https://t.me/${cleanUsername}`;
        
        if (confirm(`فتح تيليجرام مع ${name}؟`)) {
            window.open(telegramLink, '_blank');
            this.logAction('telegram', telegram, name);
        }
    }
    
    logAction(type, contact, name) {
        const log = {
            type,
            contact,
            name,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
        
        // Store last 50 actions
        const logs = JSON.parse(localStorage.getItem('teamContacts_logs') || '[]');
        logs.unshift(log);
        logs.splice(50);
        localStorage.setItem('teamContacts_logs', JSON.stringify(logs));
    }
    
    // ========== SEARCH & FILTER ==========
    handleSearch() {
        const query = this.elements.searchInput.value.trim().toLowerCase();
        this.state.searchQuery = query;
        this.elements.searchClear.style.display = query ? 'block' : 'none';
        
        this.filterContacts();
    }
    
    clearSearch() {
        this.elements.searchInput.value = '';
        this.state.searchQuery = '';
        this.elements.searchClear.style.display = 'none';
        this.filterContacts();
        this.elements.searchInput.focus();
    }
    
    toggleSearch() {
        this.elements.searchSection.classList.toggle('expanded');
    }
    
    startVoiceSearch() {
        if ('webkitSpeechRecognition' in window) {
            const recognition = new webkitSpeechRecognition();
            recognition.lang = 'ar-SA';
            recognition.start();
            
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.elements.searchInput.value = transcript;
                this.handleSearch();
            };
            
            this.showNotification('جاري الاستماع... تحدث الآن', 'info');
        } else {
            this.showNotification('البحث الصوتي غير مدعوم في متصفحك', 'warning');
        }
    }
    
    handleFilter(e) {
        const filter = e.currentTarget.dataset.filter;
        
        // Update active state
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        this.state.currentFilter = filter;
        this.filterContacts();
    }
    
    filterContacts() {
        let filtered = [...this.state.contacts];
        
        // Apply search filter
        if (this.state.searchQuery) {
            const query = this.state.searchQuery;
            filtered = filtered.filter(contact => {
                const searchable = [
                    contact.name,
                    contact.lastName,
                    contact.phone,
                    contact.whatsapp,
                    contact.telegram,
                    contact.address,
                    contact.category
                ].join(' ').toLowerCase();
                
                return searchable.includes(query);
            });
        }
        
        // Apply type filter
        if (this.state.currentFilter !== 'all') {
            filtered = filtered.filter(contact => {
                switch (this.state.currentFilter) {
                    case 'whatsapp': return !!contact.whatsapp;
                    case 'telegram': return !!contact.telegram;
                    case 'phone': return !!contact.phone;
                    default: return true;
                }
            });
        }
        
        // Apply sorting
        filtered = this.sortContacts(filtered, this.state.currentSort);
        
        this.state.filteredContacts = filtered;
        this.renderContacts();
    }
    
    // ========== SORTING ==========
    showSortModal() {
        this.elements.sortModal.style.display = 'flex';
    }
    
    hideSortModal() {
        this.elements.sortModal.style.display = 'none';
    }
    
    handleSort(e) {
        const sortBy = e.currentTarget.dataset.sort;
        this.state.currentSort = sortBy;
        this.filterContacts();
        this.hideSortModal();
        this.showNotification(`تم الترتيب حسب: ${this.getSortName(sortBy)}`, 'info');
    }
    
    sortContacts(contacts, sortBy) {
        const sorted = [...contacts];
        
        switch (sortBy) {
            case 'name':
                return sorted.sort((a, b) => 
                    (a.name || '').localeCompare(b.name || '', 'ar'));
            
            case 'name-desc':
                return sorted.sort((a, b) => 
                    (b.name || '').localeCompare(a.name || '', 'ar'));
            
            case 'category':
                return sorted.sort((a, b) => 
                    (a.category || '').localeCompare(b.category || '', 'ar'));
            
            case 'date':
                return sorted.sort((a, b) => 
                    new Date(b.createdAt) - new Date(a.createdAt));
            
            default:
                return sorted;
        }
    }
    
    getSortName(sortKey) {
        const sortNames = {
            'name': 'الاسم (أ-ي)',
            'name-desc': 'الاسم (ي-أ)',
            'category': 'الفئة',
            'date': 'الأحدث'
        };
        return sortNames[sortKey] || 'الافتراضي';
    }
    
    // ========== SCROLL HANDLING ==========
    handleScroll() {
        const currentScrollY = window.scrollY;
        const scrollingDown = currentScrollY > this.state.lastScrollY;
        const scrolledEnough = currentScrollY > 100;
        
        // Show/hide header based on scroll direction
        if (scrollingDown && scrolledEnough && this.state.headerVisible) {
            this.elements.mainHeader.classList.add('hidden');
            this.state.headerVisible = false;
        } else if (!scrollingDown && !this.state.headerVisible) {
            this.elements.mainHeader.classList.remove('hidden');
            this.state.headerVisible = true;
        }
        
        this.state.lastScrollY = currentScrollY;
    }
    
    // ========== NETWORK HANDLING ==========
    handleOnline() {
        this.state.isOnline = true;
        this.showNotification('تم استعادة الاتصال', 'success');
        
        // Auto-sync after coming online
        setTimeout(() => this.syncData(), 2000);
    }
    
    handleOffline() {
        this.state.isOnline = false;
        this.showNotification('فقدت الاتصال بالإنترنت', 'warning');
    }
    
    // ========== NOTIFICATIONS ==========
    showNotification(message, type = 'info', duration = 4000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        notification.innerHTML = `
            <i class="fas fa-${icons[type] || 'info-circle'}"></i>
            <div class="notification-content">
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        this.elements.notificationCenter.appendChild(notification);
        
        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto-remove
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, duration);
        }
    }
    
    showAuthMessage(message, type) {
        this.elements.authMessage.textContent = message;
        this.elements.authMessage.className = `auth-message ${type}`;
        this.elements.authMessage.style.display = 'block';
        
        setTimeout(() => {
            this.elements.authMessage.style.display = 'none';
        }, 3000);
    }
    
    // ========== LOADING STATES ==========
    showLoading(message = 'جاري التحميل...') {
        this.elements.loadingText.textContent = message;
        this.elements.loadingOverlay.style.display = 'flex';
    }
    
    hideLoading() {
        this.elements.loadingOverlay.style.display = 'none';
    }
    
    // ========== NAVIGATION ==========
    handleNavigation(e) {
        const page = e.currentTarget.dataset.page;
        
        // Update active state
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === page);
        });
        
        // Handle page switching (simplified for this example)
        switch (page) {
            case 'contacts':
                this.showNotification('جهات الاتصال', 'info');
                break;
            case 'favorites':
                this.showNotification('المفضلة', 'info');
                break;
            case 'stats':
                this.showNotification('الإحصائيات', 'info');
                break;
            case 'team':
                this.showNotification('معلومات الفريق', 'info');
                break;
        }
    }
    
    handleQuickAction(e) {
        const action = e.currentTarget.dataset.action;
        
        switch (action) {
            case 'call':
                this.showNotification('حدد جهة اتصال للاتصال', 'info');
                break;
            case 'whatsapp':
                this.showNotification('حدد جهة اتصال للواتساب', 'info');
                break;
            case 'telegram':
                this.showNotification('حدد جهة اتصال للتليجرام', 'info');
                break;
            case 'search':
                this.elements.searchInput.focus();
                break;
        }
    }
    
    // ========== HELPER FUNCTIONS ==========
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    updateDataSourceInfo() {
        if (this.state.lastSync) {
            const date = new Date(this.state.lastSync);
            const timeString = date.toLocaleTimeString('ar-SA', {
                hour: '2-digit',
                minute: '2-digit'
            });
            this.elements.dataSource.textContent = `آخر تحديث: ${timeString}`;
        }
    }
    
    // ========== SERVICE WORKER ==========
    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(console.error);
        }
    }
    
    // ========== TOUCH GESTURES ==========
    setupTouchGestures() {
        let startY;
        
        this.elements.appMain.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
        });
        
        this.elements.appMain.addEventListener('touchmove', (e) => {
            if (!startY) return;
            
            const currentY = e.touches[0].clientY;
            const diff = startY - currentY;
            
            // Show/hide header on vertical swipe
            if (Math.abs(diff) > 50) {
                if (diff > 0 && this.state.headerVisible) {
                    // Swipe up - hide header
                    this.elements.mainHeader.classList.add('hidden');
                    this.state.headerVisible = false;
                } else if (diff < 0 && !this.state.headerVisible) {
                    // Swipe down - show header
                    this.elements.mainHeader.classList.remove('hidden');
                    this.state.headerVisible = true;
                }
                startY = null;
            }
        });
    }
    
    // ========== INITIALIZE APP ==========
    initializeApp() {
        // Start auto-sync interval
        setInterval(() => {
            if (this.state.isOnline && !this.state.isSyncing) {
                this.syncData();
            }
        }, this.config.SYNC_INTERVAL);
        
        // Initial sync
        if (this.state.isOnline) {
            setTimeout(() => this.syncData(), 2000);
        }
    }
}

// ========== START THE APP ==========
document.addEventListener('DOMContentLoaded', () => {
    window.smartContacts = new SmartContactsApp();
});