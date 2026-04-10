/**
 * Service de notifications et tâches planifiées
 */

export interface ScheduledTask {
    id: string;
    name: string;
    type: 'restock' | 'backup' | 'report' | 'sync' | 'custom';
    description: string;
    schedule: {
      frequency: 'daily' | 'weekly' | 'monthly' | 'once';
      time: string; // HH:MM
      dayOfWeek?: number; // 0=dimanche
      dayOfMonth?: number; // 1-31
      date?: string; // ISO pour 'once'
    };
    config: Record<string, any>;
    enabled: boolean;
    lastRun?: string;
    nextRun?: string;
    createdAt: string;
    createdBy: string;
  }
  
  export interface NotificationRecord {
    id: string;
    title: string;
    body: string;
    type: 'info' | 'warning' | 'error' | 'success';
    read: boolean;
    createdAt: string;
    source: string;
  }
  
  class NotificationService {
    private storageKey = 'snl_notifications';
    private tasksKey = 'snl_scheduled_tasks';
    private schedulerInterval: ReturnType<typeof setInterval> | null = null;
  
    // ─── Notifications ──────────────────────────────────────────────────────────
  
    private getAll(): NotificationRecord[] {
      try {
        return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      } catch { return []; }
    }
  
    private saveAll(items: NotificationRecord[]) {
      localStorage.setItem(this.storageKey, JSON.stringify(items.slice(-100))); // max 100
    }
  
    send(title: string, body: string, type: NotificationRecord['type'] = 'info', source = 'system') {
      const record: NotificationRecord = {
        id: `notif_${Date.now()}`,
        title,
        body,
        type,
        read: false,
        createdAt: new Date().toISOString(),
        source,
      };
  
      const all = this.getAll();
      all.push(record);
      this.saveAll(all);
  
      // Web Notification API
      this.sendNative(title, body, type);
  
      return record;
    }
  
    private sendNative(title: string, body: string, type: string) {
      // Electron IPC
      if (typeof window !== 'undefined' && (window as any).ipcRenderer) {
        try {
          (window as any).ipcRenderer.invoke('notify', { title, body, urgency: type === 'error' ? 'critical' : 'normal' });
          return;
        } catch {}
      }
  
      // Web Notification API
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          try {
            new Notification(title, {
              body,
              icon: '/icons/logo.svg',
              badge: '/icons/logo.svg',
              tag: `snl-${type}`,
            });
          } catch {}
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(perm => {
            if (perm === 'granted') {
              try { new Notification(title, { body, icon: '/icons/logo.svg' }); } catch {}
            }
          });
        }
      }
    }
  
    getUnread(): NotificationRecord[] {
      return this.getAll().filter(n => !n.read).reverse();
    }
  
    markRead(id: string) {
      const all = this.getAll();
      const idx = all.findIndex(n => n.id === id);
      if (idx !== -1) { all[idx].read = true; this.saveAll(all); }
    }
  
    markAllRead() {
      const all = this.getAll().map(n => ({ ...n, read: true }));
      this.saveAll(all);
    }
  
    getRecent(limit = 20): NotificationRecord[] {
      return this.getAll().slice(-limit).reverse();
    }
  
    // ─── Scheduled Tasks ────────────────────────────────────────────────────────
  
    getTasks(): ScheduledTask[] {
      try {
        return JSON.parse(localStorage.getItem(this.tasksKey) || '[]');
      } catch { return []; }
    }
  
    saveTasks(tasks: ScheduledTask[]) {
      localStorage.setItem(this.tasksKey, JSON.stringify(tasks));
    }
  
    createTask(task: Omit<ScheduledTask, 'id' | 'createdAt' | 'nextRun'>): ScheduledTask {
      const t: ScheduledTask = {
        ...task,
        id: `task_${Date.now()}`,
        createdAt: new Date().toISOString(),
        nextRun: this.computeNextRun(task.schedule),
      };
      const tasks = this.getTasks();
      tasks.push(t);
      this.saveTasks(tasks);
      return t;
    }
  
    updateTask(id: string, updates: Partial<ScheduledTask>) {
      const tasks = this.getTasks();
      const idx = tasks.findIndex(t => t.id === id);
      if (idx !== -1) {
        tasks[idx] = { ...tasks[idx], ...updates, nextRun: this.computeNextRun(updates.schedule || tasks[idx].schedule) };
        this.saveTasks(tasks);
      }
    }
  
    deleteTask(id: string) {
      const tasks = this.getTasks().filter(t => t.id !== id);
      this.saveTasks(tasks);
    }
  
    toggleTask(id: string) {
      const tasks = this.getTasks();
      const idx = tasks.findIndex(t => t.id === id);
      if (idx !== -1) {
        tasks[idx].enabled = !tasks[idx].enabled;
        this.saveTasks(tasks);
      }
    }
  
    computeNextRun(schedule: ScheduledTask['schedule']): string {
      const now = new Date();
      const [h, m] = (schedule.time || '08:00').split(':').map(Number);
  
      if (schedule.frequency === 'once' && schedule.date) {
        return schedule.date;
      }
  
      if (schedule.frequency === 'daily') {
        const next = new Date(now);
        next.setHours(h, m, 0, 0);
        if (next <= now) next.setDate(next.getDate() + 1);
        return next.toISOString();
      }
  
      if (schedule.frequency === 'weekly') {
        const dow = schedule.dayOfWeek ?? 1; // lundi par défaut
        const next = new Date(now);
        next.setHours(h, m, 0, 0);
        const diff = (dow + 7 - next.getDay()) % 7;
        next.setDate(next.getDate() + (diff === 0 && next <= now ? 7 : diff));
        return next.toISOString();
      }
  
      if (schedule.frequency === 'monthly') {
        const dom = schedule.dayOfMonth ?? 1;
        const next = new Date(now);
        next.setDate(dom);
        next.setHours(h, m, 0, 0);
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
          next.setDate(dom);
        }
        return next.toISOString();
      }
  
      return new Date(now.getTime() + 24 * 3600000).toISOString();
    }
  
    // ─── Scheduler loop ──────────────────────────────────────────────────────────
  
    startScheduler(callbacks: {
      onBackup?: () => void;
      onReport?: () => void;
      onRestock?: (config: any) => void;
      onSync?: () => void;
    }) {
      if (this.schedulerInterval) clearInterval(this.schedulerInterval);
  
      this.schedulerInterval = setInterval(() => {
        const now = new Date();
        const tasks = this.getTasks();
        let updated = false;
  
        tasks.forEach(task => {
          if (!task.enabled || !task.nextRun) return;
          if (new Date(task.nextRun) > now) return;
  
          // Exécuter la tâche
          this.executeTask(task, callbacks);
  
          // Mettre à jour lastRun et nextRun
          task.lastRun = now.toISOString();
          task.nextRun = this.computeNextRun(task.schedule);
          updated = true;
        });
  
        if (updated) this.saveTasks(tasks);
      }, 60000); // check chaque minute
    }
  
    stopScheduler() {
      if (this.schedulerInterval) {
        clearInterval(this.schedulerInterval);
        this.schedulerInterval = null;
      }
    }
  
    private executeTask(task: ScheduledTask, callbacks: {
      onBackup?: () => void;
      onReport?: () => void;
      onRestock?: (config: any) => void;
      onSync?: () => void;
    }) {
      switch (task.type) {
        case 'backup':
          callbacks.onBackup?.();
          this.send('Sauvegarde automatique', `Sauvegarde planifiée "${task.name}" effectuée`, 'success', 'scheduler');
          break;
        case 'report':
          callbacks.onReport?.();
          this.send('Rapport généré', `Rapport planifié "${task.name}" généré automatiquement`, 'info', 'scheduler');
          break;
        case 'restock':
          callbacks.onRestock?.(task.config);
          this.send('Réapprovisionnement', `Rappel: ${task.name} — ${task.description}`, 'warning', 'scheduler');
          break;
        case 'sync':
          callbacks.onSync?.();
          this.send('Synchronisation', `Synchronisation cloud "${task.name}" effectuée`, 'info', 'scheduler');
          break;
        case 'custom':
          this.send(task.name, task.description, 'info', 'scheduler');
          break;
      }
    }
  }
  
  export const notifService = new NotificationService();