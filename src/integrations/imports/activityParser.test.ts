import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { activityFingerprint, parseActivities } from './activityParser';
import { duplicateKind, activeEnergy, reviewImport, prepareImport } from '../../domain/activities';

const gpx =
  '<gpx><trk><name>Corrida</name><type>running</type><trkseg><trkpt><time>2026-11-03T10:00:00Z</time></trkpt><trkpt><time>2026-11-03T10:30:00Z</time></trkpt></trkseg></trk></gpx>';
const tcx =
  '<TrainingCenterDatabase><Activities><Activity Sport="Biking"><Id>2026-11-03T10:00:00Z</Id><Lap StartTime="2026-11-03T10:00:00Z"><TotalTimeSeconds>1800</TotalTimeSeconds><DistanceMeters>10000</DistanceMeters><Calories>200</Calories><AverageHeartRateBpm><Value>140</Value></AverageHeartRateBpm></Lap></Activity></Activities></TrainingCenterDatabase>';

describe('importacao local delimitada', () => {
  it('preserva SHA-256 e IDs externos sem subtle nem randomUUID no HTTP mobile', () => {
    const getRandomValues = crypto.getRandomValues.bind(crypto);
    vi.stubGlobal('crypto', { getRandomValues });
    try {
      expect(crypto.subtle).toBeUndefined();
      const fingerprint = activityFingerprint(new TextEncoder().encode(gpx));
      expect(fingerprint).toBe(createHash('sha256').update(gpx).digest('hex'));
      expect(activityFingerprint(new Uint8Array())).toBe(createHash('sha256').digest('hex'));
      expect(parseActivities(gpx, fingerprint)[0].externalId).toBe(`${fingerprint}:0`);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('importa horarios GPX sem inventar distancia ou energia', () => {
    const [activity] = parseActivities(gpx, 'hash');
    expect(activity).toMatchObject({
      duration: 30,
      distance: null,
      energy: null,
      heartRate: null,
      sport: 'Corrida',
      source: 'gpx',
    });
  });
  it('mapeia TCX com unidades e energia de tipo desconhecido', () => {
    const [activity] = parseActivities(tcx, 'hash');
    expect(activity).toMatchObject({
      duration: 30,
      distance: 10,
      energy: 200,
      energyType: 'unknown',
      heartRate: 140,
    });
    expect(activeEnergy([activity]).value).toBeNull();
  });
  it('detecta arquivo repetido e duplicata entre fontes', () => {
    const [activity] = parseActivities(gpx, 'same');
    const [repeated] = parseActivities(gpx, 'same');
    expect(duplicateKind(activity, repeated)).toBe('exact');
    expect(duplicateKind(activity, { ...activity, source: 'strava', externalId: 'external' })).toBe(
      'possible',
    );
  });
  it('rejeita XML malformado, DTD e GPX sem horarios', () => {
    expect(() => parseActivities('<gpx>', 'hash')).toThrow();
    expect(() => parseActivities('<!DOCTYPE gpx><gpx/>', 'hash')).toThrow();
    expect(() =>
      parseActivities('<gpx><trk><trkseg><trkpt/></trkseg></trk></gpx>', 'hash'),
    ).toThrow();
  });
  it('rejeita datas impossiveis, horarios invalidos e ausencia de fuso antes de normalizar', () => {
    for (const invalid of ['2026-02-30T10:00:00Z', '2026-11-03T24:00:00Z', '2026-11-03T10:00:00']) {
      expect(() => parseActivities(gpx.replace('2026-11-03T10:00:00Z', invalid), 'hash')).toThrow();
    }
    expect(parseActivities(gpx.replaceAll('Z', '-03:00'), 'offset')[0].start).toBe(
      '2026-11-03T13:00:00.000Z',
    );
  });
  it('exige selecao explicita de possiveis duplicatas internas do lote', () => {
    const candidates = parseActivities(gpx.replace('</gpx>', gpx.slice(5)), 'batch');
    const review = reviewImport(candidates, []);
    expect(review.filter((entry) => !entry.exact && !entry.conflicts.length)).toHaveLength(0);
    expect(prepareImport(candidates, [], new Set([candidates[0].id]), [])).toHaveLength(1);
    expect(
      prepareImport(candidates, [], new Set(candidates.map((activity) => activity.id)), []),
    ).toHaveLength(2);
  });
  it('bloqueia novo conflito durante a gravacao e ignora reimportacao exata', () => {
    const [candidate] = parseActivities(gpx, 'new');
    const [existing] = parseActivities(gpx, 'existing');
    const selected = new Set([candidate.id]);
    expect(() => prepareImport([candidate], [existing], selected, [])).toThrow('mudaram');
    expect(prepareImport([candidate], [existing], selected, [existing])).toHaveLength(1);
    expect(
      prepareImport([candidate], [{ ...candidate, id: 'persisted' }], selected, []),
    ).toHaveLength(0);
  });
});
