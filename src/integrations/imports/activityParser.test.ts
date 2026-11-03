import { describe, expect, it } from 'vitest';
import { parseActivities } from './activityParser';
import { duplicateKind, activeEnergy } from '../../domain/activities';

const gpx =
  '<gpx><trk><name>Corrida</name><type>running</type><trkseg><trkpt><time>2026-11-03T10:00:00Z</time></trkpt><trkpt><time>2026-11-03T10:30:00Z</time></trkpt></trkseg></trk></gpx>';
const tcx =
  '<TrainingCenterDatabase><Activities><Activity Sport="Biking"><Id>2026-11-03T10:00:00Z</Id><Lap StartTime="2026-11-03T10:00:00Z"><TotalTimeSeconds>1800</TotalTimeSeconds><DistanceMeters>10000</DistanceMeters><Calories>200</Calories><AverageHeartRateBpm><Value>140</Value></AverageHeartRateBpm></Lap></Activity></Activities></TrainingCenterDatabase>';

describe('importacao local delimitada', () => {
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
});
