import React, { useMemo } from 'react';
import { theme } from '@/components/common/theme';
import { DetailHeader, DetailChip, DetailLinkIconButton } from '@/components/detail/DetailHeader';
import { DetailPageLayout } from '@/components/detail/DetailPageLayout';
import { DetailSection } from '@/components/detail/DetailSection';
import { InfoRow, InfoGrid } from '@/components/detail/InfoRow';
import { AlbumSection } from '@/components/detail/AlbumSection';
import { Artist, Tour, Concert } from '@/domain/types';
import { Icons, IconButton } from '@/components/common/IconButton';
import { GoodsSection } from '@/components/detail/GoodsSection';
import dayjs from 'dayjs';

interface Props {
  artistId: string;
  concertId: string;
  artist: Artist;
  tour: Tour;
  concert: Concert;
  onBack: () => void;
  onOpenArtistDetail: (artistId: string) => void;
  onOpenConcertEditor: (artistId: string, tourId: string) => void;
  onUpdateConcertAlbum: (artistId: string, tourId: string, concertId: string, imageIds: string[]) => void;
}

const formatDateWithWeekday = (dateStr?: string) => {
  if (!dateStr) return '';
  const d = dayjs(dateStr);
  if (!d.isValid()) return dateStr;
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.format('YYYY年MM月DD日')}（${weekdays[d.day()]}）`;
};

export const ConcertHomePage: React.FC<Props> = ({
  artistId,
  concertId,
  artist,
  tour,
  concert,
  onBack,
  onOpenArtistDetail,
  onOpenConcertEditor,
  onUpdateConcertAlbum
}) => {
  const bgUrl = tour.imageUrl || artist.imageUrl || '';
  const heroImageUrl = tour.imageUrl || artist.imageUrl || '';

  const concertDate = concert.concertAt || concert.date;

  // 基本情報
  const basicInfo = [
    { label: '日付', value: formatDateWithWeekday(concertDate) },
    { label: '開場', value: concert.doorTime },
    { label: '開演', value: concert.startTime },
    { label: '会場', value: concert.venue },
  ];

  // チケット情報
  const ticketInfo = [
    { label: '座席種類', value: concert.seatType },
    { label: '座席', value: concert.seatLocation },
  ];

  // 抽選履歴
  const lotteryHistory = concert.lotteryHistory || [];
  const hasLotteryHistory = lotteryHistory.length > 0;

  // セットリスト
  const setlist = useMemo(() => {
    const list = concert.setlist || [];
    return list.sort((a, b) => a.order - b.order);
  }, [concert.setlist]);

  const hasSetlist = setlist.length > 0;

  return (
    <DetailPageLayout backgroundUrl={bgUrl} bottomPadding={140}>
      <DetailHeader
        title={tour.name || ''}
        titlePlaceholder="公演名未設定"
        posterUrl={heroImageUrl}
        posterAlt={tour.name}
        onBack={onBack}
        actions={
          <IconButton
            icon={<Icons.Edit />}
            onClick={() => onOpenConcertEditor(artistId, tour.id)}
            style={{ background: 'rgba(255,255,255,0.82)', border: 'none', color: theme.colors.primary }}
          />
        }
        subtitle={
          <button
            onClick={() => onOpenArtistDetail(artist.id)}
            style={{
              width: 'fit-content',
              border: 'none',
              background: 'transparent',
              padding: 0,
              color: 'rgba(255,255,255,0.92)',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'underline',
              textUnderlineOffset: '4px',
              textDecorationColor: 'rgba(255,255,255,0.45)',
              cursor: 'pointer',
            }}
          >
            {artist.name}
          </button>
        }
        tags={
          <>
            <DetailChip
              label={concert.status}
              bg={theme.colors.status[concert.status as keyof typeof theme.colors.status] || theme.colors.primary}
            />
            <DetailChip label={concert.isParticipated ? '参戦済み' : '公演情報'} subtle />
            {concert.saleLink && (
              <DetailLinkIconButton
                onClick={() => window.open(concert.saleLink, '_blank', 'noopener,noreferrer')}
                title="販売ページを開く"
              />
            )}
            {tour.officialUrl && (
              <DetailLinkIconButton
                onClick={() => window.open(tour.officialUrl!, '_blank', 'noopener,noreferrer')}
                title="ツアー公式サイトを開く"
              />
            )}
          </>
        }
      />

      {/* 基本情報 */}
      <DetailSection title="基本情報">
        <InfoGrid items={basicInfo} />
      </DetailSection>

      {/* チケット情報 */}
      {(concert.seatType || concert.seatLocation) && (
        <DetailSection title="チケット情報">
          <InfoGrid items={ticketInfo} />
        </DetailSection>
      )}

      {/* 抽選履歴 */}
      {hasLotteryHistory && (
        <DetailSection title="抽選履歴">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {lotteryHistory.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: 12,
                  background: 'rgba(0,0,0,0.02)',
                  borderRadius: 12,
                  border: '1px solid rgba(15,23,42,0.06)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: theme.colors.text }}>
                    {item.lotteryName || '抽選'}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: 12,
                      background: item.result === 'WON' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                      color: item.result === 'WON' ? '#10B981' : '#EF4444',
                    }}
                  >
                    {item.result === 'WON' ? '当選' : '落選'}
                  </div>
                </div>
                {item.resultAt && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: theme.colors.textSecondary }}>
                    結果発表: {dayjs(item.resultAt).format('YYYY/MM/DD HH:mm')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DetailSection>
      )}

      {/* ライブセットリスト */}
      {hasSetlist && (
        <DetailSection title="ライブセットリスト">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {setlist.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 12px',
                  background: 'rgba(0,0,0,0.02)',
                  borderRadius: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: theme.colors.textSecondary,
                    minWidth: 30,
                  }}
                >
                  {idx + 1}.
                </div>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: theme.colors.text }}>
                  {item.song}
                </div>
              </div>
            ))}
          </div>
        </DetailSection>
      )}

      {/* グッズ */}
      {concert.goods && concert.goods.length > 0 && (
        <DetailSection title="グッズ">
          <GoodsSection items={concert.goods || []} />
        </DetailSection>
      )}

      {/* アルバム */}
      <DetailSection title="アルバム">
        <AlbumSection
          imageIds={concert.imageIds || []}
          onChange={(newImageIds) => onUpdateConcertAlbum(artistId, tour.id, concertId, newImageIds)}
          title=""
        />
      </DetailSection>
    </DetailPageLayout>
  );
};
