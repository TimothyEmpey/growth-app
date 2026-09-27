import { NativeModule, requireNativeModule } from 'expo';

export type HealthRun = {
  id: string;
  title: string;
  sourceName: string;
  sourceBundleIdentifier: string;
  date: string;
  distanceMeters: number;
  movingSeconds: number;
  elapsedSeconds: number;
  elevationMeters: number;
  averageHeartRate: number | null;
};

export type HealthWeight = { id: string; date: string; pounds: number };

declare class GrowthHealthModule extends NativeModule {
  isAvailable(): boolean;
  requestRunningAuthorization(): Promise<boolean>;
  requestWeightAuthorization(): Promise<boolean>;
  getRunningWorkouts(startDate: string, endDate: string): Promise<HealthRun[]>;
  getRunningWorkout(id: string): Promise<HealthRun | null>;
  getBodyWeights(): Promise<HealthWeight[]>;
}

export default requireNativeModule<GrowthHealthModule>('GrowthHealth');
