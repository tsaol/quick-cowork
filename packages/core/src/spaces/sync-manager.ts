import type { SyncState } from '@quick-cowork/shared';
import type { SettingsStore } from '../store/settings-store.js';

export interface LocalUser {
  id: string;
  name: string;
}

export class SyncManager {
  private states = new Map<string, SyncState>();
  private settings: SettingsStore;
  private cachedUser: LocalUser | null = null;

  constructor(settings: SettingsStore) {
    this.settings = settings;
  }

  /**
   * Stable per-machine identity. Real auth comes when the WebSocket/WebRTC layer lands;
   * for now this is just enough to attribute messages and presence locally.
   */
  getLocalUser(): LocalUser {
    if (this.cachedUser) return this.cachedUser;

    const stored = this.settings.get();
    if (stored.spaceLocalUser && stored.spaceLocalUser.id && stored.spaceLocalUser.name) {
      this.cachedUser = stored.spaceLocalUser;
      return stored.spaceLocalUser;
    }

    const user: LocalUser = {
      id: crypto.randomUUID(),
      name: `User-${Math.random().toString(36).slice(2, 6)}`,
    };
    this.settings.set({ spaceLocalUser: user });
    this.cachedUser = user;
    return user;
  }

  setLocalUserName(name: string): LocalUser {
    const current = this.getLocalUser();
    const next: LocalUser = { ...current, name };
    this.settings.set({ spaceLocalUser: next });
    this.cachedUser = next;
    return next;
  }

  getSyncState(spaceId: string): SyncState {
    let state = this.states.get(spaceId);
    if (!state) {
      state = {
        lastSyncAt: Date.now(),
        pendingChanges: 0,
        connected: true,
      };
      this.states.set(spaceId, state);
    }
    return { ...state };
  }

  markPending(spaceId: string): void {
    const state = this.getSyncState(spaceId);
    this.states.set(spaceId, {
      ...state,
      pendingChanges: state.pendingChanges + 1,
    });
  }

  markSynced(spaceId: string): SyncState {
    const next: SyncState = {
      lastSyncAt: Date.now(),
      pendingChanges: 0,
      connected: true,
    };
    this.states.set(spaceId, next);
    return { ...next };
  }
}
