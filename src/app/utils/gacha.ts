import dayjs from 'dayjs';
import { Gacha, GachaPrize, GachaStatus } from '@/domain/types';
import { theme } from '@/components/common/theme';

export const GACHA_STATUSES: GachaStatus[] = ['発売前', '抽選予定', '抽選済み', '一部売却済み', '完了', '見送り'];

export const getNumber = (value?: number | null) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

export const getPrizeSoldAmount = (prize: GachaPrize): number => {
  if (typeof prize.soldTotal === 'number' && Number.isFinite(prize.soldTotal)) return prize.soldTotal;
  return getNumber(prize.soldCount) * getNumber(prize.salePrice);
};

export const getGachaStats = (gacha: Gacha) => {
  const pricePerDraw = getNumber(gacha.pricePerDraw);
  const drawCount = getNumber(gacha.drawCount);
  const drawSubtotal = pricePerDraw * drawCount;
  const otherCosts = getNumber(gacha.otherCosts);
  const grossTotal = drawSubtotal + otherCosts;
  const soldTotal = (gacha.prizes || []).reduce((sum, prize) => sum + getPrizeSoldAmount(prize), 0);
  const finalCost = grossTotal - soldTotal;
  const wonTotal = (gacha.prizes || []).reduce((sum, prize) => sum + getNumber(prize.wonCount), 0);
  const keepTotal = (gacha.prizes || []).reduce((sum, prize) => sum + getNumber(prize.keepCount), 0);
  const soldCount = (gacha.prizes || []).reduce((sum, prize) => sum + getNumber(prize.soldCount), 0);
  const wantedWonTotal = (gacha.prizes || []).reduce((sum, prize) => sum + (prize.wanted ? getNumber(prize.wonCount) : 0), 0);
  const unwantedWonTotal = (gacha.prizes || []).reduce((sum, prize) => sum + (!prize.wanted ? getNumber(prize.wonCount) : 0), 0);
  const unitKeepCost = keepTotal > 0 ? Math.round(finalCost / keepTotal) : undefined;

  return { pricePerDraw, drawCount, drawSubtotal, otherCosts, grossTotal, soldTotal, finalCost, wonTotal, keepTotal, soldCount, wantedWonTotal, unwantedWonTotal, unitKeepCost };
};

export const deriveGachaStatus = (gacha: Gacha, now = new Date()): GachaStatus => {
  if (gacha.status === '見送り' || gacha.status === '完了') return gacha.status;
  const stats = getGachaStats(gacha);
  if (stats.drawCount > 0 || stats.wonTotal > 0) {
    if (stats.soldCount > 0 || stats.soldTotal > 0) return '一部売却済み';
    return '抽選済み';
  }
  const release = gacha.releaseDate ? dayjs(gacha.releaseDate) : null;
  if (release?.isValid() && release.isAfter(dayjs(now).startOf('day'))) return '発売前';
  if (gacha.releaseDate || gacha.drawDateTime) return '抽選予定';
  return gacha.status || '抽選予定';
};

export const getGachaStatusTone = (status: string) => {
  switch (status) {
    case '発売前':
      return { color: theme.colors.status['発売前'], bg: theme.colors.badges.processing.bg, label: '発売前' };
    case '抽選予定':
      return { color: theme.colors.status['参戦予定'], bg: theme.colors.badges.confirmed.bg, label: '抽選予定' };
    case '抽選済み':
      return { color: theme.colors.primary, bg: 'rgba(83,190,232,0.12)', label: '抽選済み' };
    case '一部売却済み':
      return { color: theme.colors.status['抽選中'], bg: theme.colors.badges.lottery.bg, label: '一部売却済み' };
    case '完了':
      return { color: theme.colors.status['参戦済み'], bg: theme.colors.badges.completed.bg, label: '完了' };
    case '見送り':
      return { color: theme.colors.status['見送'], bg: theme.colors.badges.skipped.bg, label: '見送り' };
    default:
      return { color: theme.colors.textWeak, bg: 'rgba(0,0,0,0.04)', label: status || '未設定' };
  }
};

export const formatCurrency = (value?: number | null) => `¥${Math.round(getNumber(value)).toLocaleString()}`;
export const formatDate = (date?: string) => (date ? dayjs(date).format('YYYY/MM/DD') : '未設定');
export const formatDateTime = (value?: string) => {
  if (!value) return '未設定';
  const d = dayjs(value.replace('T', ' '));
  return d.isValid() ? d.format('YYYY/MM/DD HH:mm') : value;
};
