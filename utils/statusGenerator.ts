import { Artist, StatusItem, Exhibition } from '../domain/types';
import { parseConcertDate, getEffectiveExhibitionStatus } from '../domain/logic';
import dayjs from 'dayjs';

export function generateStatusItems(artists: Artist[], exhibitions: Exhibition[]): StatusItem[] {
  const items: StatusItem[] = [];
  const now = new Date();

  (artists || []).forEach((artist) => {
    (artist.tours || []).forEach((tour) => {
      (tour.concerts || []).forEach((concert) => {
        const concertDateStr = concert.concertAt || concert.date;
        const concertDate = parseConcertDate(concertDateStr, 'CONCERT');
        const isPassed = concertDate && now >= concertDate;

        let actionType: StatusItem['actionType'] = 'lottery';
        let displayStatus: string = concert.status;

        if (concert.status === '抽選中') {
          actionType = 'result';
        } else if (concert.status === '参戦予定' || concert.status === '参戦済み') {
          actionType = 'ticket';
        }

        if (concert.status === '見送' && concert.lotteryResult === 'LOST') {
          displayStatus = '落選';
        } else if (concert.status === '参戦予定' && concert.lotteryResult === 'WON') {
          displayStatus = '当選';
        } else if (concert.status === '見送' && isPassed) {
          displayStatus = '見送';
        }

        items.push({
          id: `${artist.id}-${tour.id}-${concert.id}`,
          type: 'concert',
          parentId: artist.id,
          title: `${artist.name} - ${tour.name}`,
          date: concertDateStr,
          status: concert.status,
          actionType,
          displayStatus,
          raw: {
            artistId: artist.id,
            artistName: artist.name,
            artistImageUrl: (artist as any).avatar || artist.imageUrl || '',
            artistImageId: (artist as any).imageId,
            tourId: tour.id,
            tourName: tour.name,
            tourImageUrl: tour.imageUrl || '',
            tourImageId: (tour as any).imageId,
            concertId: concert.id,
            ...concert,
          },
        });
      });
    });
  });

  (exhibitions || []).forEach((exhibition) => {
    const effectiveStatus = getEffectiveExhibitionStatus(exhibition, now);
    const baseRaw = { ...exhibition, effectiveStatus };
    const startDate = exhibition.startDate;
    const endDate = exhibition.endDate;
    const visitDate = exhibition.visitedAt || endDate || startDate;

    if (effectiveStatus === 'NONE') {
      return;
    }

    if (effectiveStatus === 'PLANNED') {
      items.push({
        id: `exh-planned-${exhibition.id}`,
        type: 'exhibition',
        parentId: exhibition.id,
        title: exhibition.title,
        date: startDate,
        status: 'PLANNED',
        actionType: 'exhibition_start',
        displayStatus: '開催中',
        raw: baseRaw,
      });
      return;
    }

    if (effectiveStatus === 'RESERVED') {
      items.push({
        id: `exh-reserved-${exhibition.id}`,
        type: 'exhibition',
        parentId: exhibition.id,
        title: exhibition.title,
        date: exhibition.visitedAt || startDate,
        status: 'RESERVED',
        actionType: 'exhibition_start',
        displayStatus: '予約済',
        raw: baseRaw,
      });
      return;
    }

    if (effectiveStatus === 'VISITED') {
      items.push({
        id: `exh-visited-${exhibition.id}`,
        type: 'exhibition',
        parentId: exhibition.id,
        title: exhibition.title,
        date: visitDate,
        status: 'VISITED',
        actionType: 'exhibition_end',
        displayStatus: '参戦済み',
        raw: baseRaw,
      });
      return;
    }

    if (effectiveStatus === 'SKIPPED') {
      items.push({
        id: `exh-skipped-${exhibition.id}`,
        type: 'exhibition',
        parentId: exhibition.id,
        title: exhibition.title,
        date: endDate || startDate,
        status: 'SKIPPED',
        actionType: 'exhibition_end',
        displayStatus: '見送る',
        raw: baseRaw,
      });
      return;
    }

    items.push({
      id: `exh-ended-${exhibition.id}`,
      type: 'exhibition',
      parentId: exhibition.id,
      title: exhibition.title,
      date: endDate || startDate,
      status: 'ENDED',
      actionType: 'exhibition_end',
      displayStatus: '終了',
      raw: baseRaw,
    });
  });

  return items;
}
