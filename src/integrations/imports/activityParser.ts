import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { activitySchema, type Activity } from '../../types';
import { createId } from '../../utils/ids';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

export function activityFingerprint(bytes: Uint8Array): string {
  return bytesToHex(sha256(bytes));
}

type Node = Record<string, unknown>;
const object = (value: unknown): Node =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Node) : {};
const list = (value: unknown): unknown[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];
const numeric = (value: unknown): number | null => {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};
function timestamp(value: unknown): string {
  const text = String(value ?? '');
  if (!activitySchema.shape.start.safeParse(text).success || !Number.isFinite(Date.parse(text)))
    throw new Error('A atividade precisa de horarios validos com fuso horario.');
  return new Date(text).toISOString();
}
const sportName = (value: unknown) => {
  const sport = String(value ?? '').toLowerCase();
  if (['running', 'run', 'corrida'].includes(sport)) return 'Corrida';
  if (['biking', 'cycling', 'ride', 'ciclismo'].includes(sport)) return 'Ciclismo';
  if (['swimming', 'swim', 'natacao'].includes(sport)) return 'Natacao';
  if (['walking', 'walk', 'caminhada'].includes(sport)) return 'Caminhada';
  return 'Outro';
};

export function parseActivities(xml: string, fingerprint: string): Activity[] {
  if (xml.length > 10 * 1024 * 1024) throw new Error('O limite e 10 MB por arquivo GPX/TCX.');
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('XML com entidades ou DTD nao e permitido.');
  if (XMLValidator.validate(xml) !== true) throw new Error('Arquivo XML invalido.');
  const root = object(
    new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: true,
      parseTagValue: false,
      processEntities: false,
    }).parse(xml),
  );
  const defaults = {
    notes: '',
    exercises: [],
    energyType: 'unknown' as const,
    heartRate: null,
    energy: null,
    distance: null,
    importedAt: new Date().toISOString(),
  };
  let candidates: unknown[];
  if (root.gpx) {
    candidates = list(object(root.gpx).trk).map((value, index) => {
      const track = object(value);
      const points = list(track.trkseg)
        .flatMap((segment) => list(object(segment).trkpt))
        .map(object);
      const times = points
        .filter((point) => point.time !== undefined)
        .map((point) => timestamp(point.time));
      if (times.length < 2)
        throw new Error(
          'GPX precisa de pelo menos dois pontos com horario. Rotas sem horario nao sao suportadas.',
        );
      if (times.some((time, position) => position > 0 && time < times[position - 1]))
        throw new Error('GPX possui horarios fora de ordem.');
      const start = times[0];
      return {
        ...defaults,
        id: createId(),
        externalId: `${fingerprint}:${index}`,
        source: 'gpx',
        name: String(track.name ?? 'Atividade GPX'),
        sport: sportName(track.type),
        start,
        duration: (Date.parse(times.at(-1)!) - Date.parse(start)) / 60000,
      };
    });
  } else if (root.TrainingCenterDatabase) {
    candidates = list(object(object(root.TrainingCenterDatabase).Activities).Activity).map(
      (value, index) => {
        const activity = object(value);
        const laps = list(activity.Lap).map(object);
        if (!laps.length) throw new Error('TCX sem voltas (Lap) suportadas.');
        const durations = laps.map((lap) => numeric(lap.TotalTimeSeconds));
        if (durations.some((duration) => duration === null))
          throw new Error('TCX com duracao ausente ou invalida.');
        const duration = durations.reduce<number>((sum, value) => sum + value!, 0);
        const distances = laps.map((lap) => numeric(lap.DistanceMeters));
        const calories = laps.map((lap) => numeric(lap.Calories));
        const heartRates = laps.map((lap) => numeric(object(lap.AverageHeartRateBpm).Value));
        const start = timestamp(laps[0]['@_StartTime'] ?? activity.Id);
        return {
          ...defaults,
          id: createId(),
          externalId: `${fingerprint}:${index}`,
          source: 'tcx',
          name: `Atividade ${sportName(activity['@_Sport'])}`,
          sport: sportName(activity['@_Sport']),
          start,
          duration: duration / 60,
          distance: distances.every((value) => value !== null)
            ? distances.reduce<number>((sum, value) => sum + value!, 0) / 1000
            : null,
          energy: calories.every((value) => value !== null)
            ? calories.reduce<number>((sum, value) => sum + value!, 0)
            : null,
          heartRate:
            heartRates.every((value) => value !== null && value > 0) && duration > 0
              ? Math.round(
                  heartRates.reduce<number>(
                    (sum, value, position) => sum + value! * durations[position]!,
                    0,
                  ) / duration,
                )
              : null,
        };
      },
    );
  } else throw new Error('Formato nao suportado. Use GPX com tracks ou TCX com atividades.');
  if (!candidates.length) throw new Error('Nenhuma atividade encontrada.');
  if (candidates.length > 500) throw new Error('Limite de 500 atividades por arquivo.');
  return candidates.map((candidate) => activitySchema.parse(candidate));
}
