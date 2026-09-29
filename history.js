(function (root) {
  'use strict';
  // Session-only snapshots. B connects history navigation to the editor.
  class EditHistory {
    constructor(maxEntries = 36, maxChars = 24000000) {
      this.maxEntries = maxEntries;
      this.maxChars = maxChars;
      this.entries = [];
      this.index = -1;
      this.nextId = 0;
    }

    reset(snapshot) {
      this.entries = [{ id: this.nextId++, label: '초기 상태', snapshot }];
      this.index = 0;
    }

    record(snapshot, label) {
      if (this.entries[this.index]?.snapshot === snapshot) return;
      // 과거 기록을 보고 있는 상태에서 새 변경 발생 시 미래 항목 제거
      this.entries = this.entries.slice(0, this.index + 1);
      this.entries.push({ id: this.nextId++, label, snapshot });

      let chars = this.entries.reduce((sum, entry) => sum + entry.snapshot.length, 0);
      while (this.entries.length > 1 &&
             (this.entries.length > this.maxEntries || chars > this.maxChars)) {
        chars -= this.entries.shift().snapshot.length;
      }
      this.index = this.entries.length - 1;
    }

    setIndex(index) {
      if (index >= 0 && index < this.entries.length) {
        this.index = index;
      }
    }

    getCurrentSnapshot() {
      if (this.index >= 0 && this.index < this.entries.length) {
        return this.entries[this.index].snapshot;
      }
      return null;
    }
  }

  root.EditHistory = EditHistory;
  if (typeof module !== 'undefined') module.exports = EditHistory;
})(typeof window !== 'undefined' ? window : globalThis);