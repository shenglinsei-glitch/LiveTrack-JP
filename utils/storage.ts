
export const safeSave = (key: string, data: any) => {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
  } catch (err: any) {
    console.error(`Persistence Error for key [${key}]:`, err);
    let userMsg = "データの保存に失敗しました。";
    if (err.name === 'QuotaExceededError' || err.code === 22) {
      userMsg += "\nストレージ容量が不足しています。";
    }
    window.alert(userMsg);
  }
};

export const safeGet = <T>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return defaultValue;
    return JSON.parse(saved) as T;
  } catch (err) {
    console.error(`Read Error for key [${key}]:`, err);
    return defaultValue;
  }
};
