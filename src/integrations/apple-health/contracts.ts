import type { Activity } from '../../types';

export type HealthReadType = 'workouts' | 'activeEnergy' | 'basalEnergy' | 'heartRate' | 'bodyMass';
export interface HealthSample {
  externalId: string;
  type: Exclude<HealthReadType, 'workouts'>;
  start: string;
  end: string;
  value: number;
  unit: 'kcal' | 'bpm' | 'kg';
  source: string;
}
export interface HealthKitAdapter {
  isAvailable(): Promise<boolean>;
  requestReadPermissions(types: HealthReadType[]): Promise<void>;
  readWorkouts(start: string, end: string): Promise<Activity[]>;
  readSamples(types: HealthReadType[], start: string, end: string): Promise<HealthSample[]>;
}
