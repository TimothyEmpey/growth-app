import ExpoModulesCore
import HealthKit

public class GrowthHealthModule: Module {
  private let store = HKHealthStore()

  public func definition() -> ModuleDefinition {
    Name("GrowthHealth")

    Function("isAvailable") { HKHealthStore.isHealthDataAvailable() }

    AsyncFunction("requestRunningAuthorization") { () async throws -> Bool in
      guard HKHealthStore.isHealthDataAvailable() else { return false }
      try await store.requestAuthorization(toShare: [], read: runningTypes())
      return true
    }

    AsyncFunction("requestWeightAuthorization") { () async throws -> Bool in
      guard HKHealthStore.isHealthDataAvailable(),
            let bodyMass = HKQuantityType.quantityType(forIdentifier: .bodyMass) else { return false }
      try await store.requestAuthorization(toShare: [], read: [bodyMass])
      return true
    }

    AsyncFunction("getRunningWorkouts") { (startDate: String, endDate: String) async throws -> [[String: Any]] in
      guard let start = ISO8601DateFormatter().date(from: startDate),
            let end = ISO8601DateFormatter().date(from: endDate) else {
        throw Exception(name: "InvalidDate", description: "Growth could not read the selected date range.")
      }
      let predicate = NSCompoundPredicate(andPredicateWithSubpredicates: [
        HKQuery.predicateForWorkouts(with: .running),
        HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate),
      ])
      return try await workouts(predicate: predicate).map { serializeWorkout($0) }
    }

    AsyncFunction("getRunningWorkout") { (id: String) async throws -> [String: Any]? in
      guard let uuid = UUID(uuidString: id) else { return nil }
      return try await workouts(predicate: HKQuery.predicateForObject(with: uuid), limit: 1)
        .first.map { serializeWorkout($0) }
    }

    AsyncFunction("getBodyWeights") { () async throws -> [[String: Any]] in
      guard let bodyMass = HKQuantityType.quantityType(forIdentifier: .bodyMass) else { return [] }
      return try await samples(type: bodyMass).compactMap { sample in
        guard let quantity = sample as? HKQuantitySample else { return nil }
        return [
          "id": quantity.uuid.uuidString,
          "date": ISO8601DateFormatter().string(from: quantity.startDate),
          "pounds": quantity.quantity.doubleValue(for: HKUnit.pound()),
        ]
      }
    }
  }

  private func runningTypes() -> Set<HKObjectType> {
    var types: Set<HKObjectType> = [HKObjectType.workoutType()]
    for identifier in [HKQuantityTypeIdentifier.heartRate, .distanceWalkingRunning] {
      if let type = HKQuantityType.quantityType(forIdentifier: identifier) { types.insert(type) }
    }
    return types
  }

  private func workouts(predicate: NSPredicate, limit: Int = HKObjectQueryNoLimit) async throws -> [HKWorkout] {
    try await withCheckedThrowingContinuation { continuation in
      let query = HKSampleQuery(
        sampleType: HKObjectType.workoutType(),
        predicate: predicate,
        limit: limit,
        sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]
      ) { _, samples, error in
        if let error { continuation.resume(throwing: error) }
        else { continuation.resume(returning: samples as? [HKWorkout] ?? []) }
      }
      store.execute(query)
    }
  }

  private func samples(type: HKSampleType) async throws -> [HKSample] {
    try await withCheckedThrowingContinuation { continuation in
      let query = HKSampleQuery(
        sampleType: type,
        predicate: nil,
        limit: HKObjectQueryNoLimit,
        sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
      ) { _, samples, error in
        if let error { continuation.resume(throwing: error) }
        else { continuation.resume(returning: samples ?? []) }
      }
      store.execute(query)
    }
  }

  private func serializeWorkout(_ workout: HKWorkout) -> [String: Any] {
    let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate)
    let heartRate = heartRateType.flatMap { type in
      workout.statistics(for: type)?.averageQuantity()?.doubleValue(
        for: HKUnit.count().unitDivided(by: .minute())
      )
    }
    let serializedHeartRate: Any
    if let heartRate { serializedHeartRate = heartRate }
    else { serializedHeartRate = NSNull() }
    let elevation = (workout.metadata?[HKMetadataKeyElevationAscended] as? HKQuantity)?
      .doubleValue(for: .meter()) ?? 0
    return [
      "id": workout.uuid.uuidString,
      "title": workout.sourceRevision.source.name + " Run",
      "date": ISO8601DateFormatter().string(from: workout.startDate),
      "distanceMeters": workout.totalDistance?.doubleValue(for: .meter()) ?? 0,
      "movingSeconds": workout.duration,
      "elapsedSeconds": workout.endDate.timeIntervalSince(workout.startDate),
      "elevationMeters": elevation,
      "averageHeartRate": serializedHeartRate,
    ]
  }
}
