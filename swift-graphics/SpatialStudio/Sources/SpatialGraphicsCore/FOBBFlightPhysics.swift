//
//  FOBBFlightPhysics.swift
//  SpatialGraphicsCore
//
//  3D Gravity-Powered FOBB (Flying Object Built to Bounce) Trajectory & Elastomer Bounce Solver.
//  Models Gravity Wizards Launcher 2.0 (2:1 compound pulley + wireless RP11 release),
//  1/2" steel ball-bearing Center-of-Gravity tuning (#761035), 180° protractor launch angle (#761036),
//  and soft black rubber nosecone restitution across Earth gyms (9.81 m/s²) or Shackleton Moon Rim (1.62 m/s²).
//

import Foundation

public enum GravityArena: String, CaseIterable, Codable, Sendable {
    case anchorageGymnasium = "Anchorage School Gym (9.81 m/s²)"
    case lunarShackletonRim = "Lunar South Pole z404 (1.62 m/s²)"

    public var gravityMps2: Double {
        switch self {
        case .anchorageGymnasium: return 9.81
        case .lunarShackletonRim: return 1.62
        }
    }

    public var airDensityKgM3: Double {
        switch self {
        case .anchorageGymnasium: return 1.225
        case .lunarShackletonRim: return 0.0
        }
    }
}

public struct FOBBLaunchConfig: Equatable, Codable, Sendable {
    public var arena: GravityArena
    /// Counterweight mass in kg (e.g. 2x 1-gallon water jugs = 7.57 kg).
    public var counterweightKg: Double
    /// Counterweight drop height in meters (e.g. 1.8 m).
    public var dropHeightMeters: Double
    /// Launch guide-board angle in degrees from horizontal (measured with #761036 180° Protractor).
    public var launchAngleDegrees: Double
    /// Forward CG ballast position (0.0 = aft Bare Bone, 1.0 = full forward #761035 ball-bearing + coupler).
    public var cgForwardFraction: Double
    /// Fin cant spin angle in degrees (0...15°).
    public var finCantDegrees: Double

    public init(
        arena: GravityArena = .anchorageGymnasium,
        counterweightKg: Double = 7.5,
        dropHeightMeters: Double = 1.6,
        launchAngleDegrees: Double = 52.0,
        cgForwardFraction: Double = 0.68,
        finCantDegrees: Double = 4.0
    ) {
        self.arena = arena
        self.counterweightKg = counterweightKg
        self.dropHeightMeters = dropHeightMeters
        self.launchAngleDegrees = launchAngleDegrees
        self.cgForwardFraction = cgForwardFraction
        self.finCantDegrees = finCantDegrees
    }

    /// Total FOBB mass in kg (~0.048 kg Bare Bone up to ~0.082 kg Heavy Bone w/ 1/2" ball bearing + hex coupler).
    public var fobbMassKg: Double {
        0.048 + 0.034 * max(0.0, min(1.0, cgForwardFraction))
    }

    /// Estimated exit speed (m/s) off the 2:1 compound-pulley folding guide-board after MSD RP11 wireless release.
    public var exitVelocityMps: Double {
        let g = arena.gravityMps2
        let pulleyMechanicalRatio = 2.0
        let rigEfficiency = 0.62
        let potentialJ = counterweightKg * g * dropHeightMeters * rigEfficiency
        let effectiveMass = counterweightKg + (pulleyMechanicalRatio * pulleyMechanicalRatio) * fobbMassKg * 4.0
        let shuttleSpeed = (2.0 * potentialJ / max(0.2, effectiveMass)).squareRoot()
        return min(24.0, shuttleSpeed * pulleyMechanicalRatio * 1.45)
    }
}

public struct TrajectorySample: Equatable, Sendable {
    public let time: Double
    public let position: Vec3
    public let velocity: Vec3
    public let bounceCount: Int
}

public enum FOBBFlightSolver {
    /// Simulates a complete 3D launch + multi-bounce indoor gymnasium or lunar flight.
    public static func simulate(_ cfg: FOBBLaunchConfig, dt: Double = 1.0 / 120.0, maxSeconds: Double = 8.0) -> [TrajectorySample] {
        let g = cfg.arena.gravityMps2
        let rho = cfg.arena.airDensityKgM3
        let rad = cfg.launchAngleDegrees * .pi / 180.0
        let v0 = cfg.exitVelocityMps

        var pos = Vec3(0, 0.35, 0)
        var vel = Vec3(v0 * cos(rad), v0 * sin(rad), sin(cfg.finCantDegrees * .pi / 180.0) * 0.6)
        var bounces = 0
        var t = 0.0

        // Forward CG improves nose-first rubber-nosecone alignment -> higher clean bounce restitution!
        let baseRestitution = 0.64 + 0.16 * max(0.0, min(1.0, cfg.cgForwardFraction))
        let dragArea = 0.0014 * (1.0 + 0.02 * abs(cfg.finCantDegrees))
        let mass = cfg.fobbMassKg

        var samples: [TrajectorySample] = [TrajectorySample(time: 0, position: pos, velocity: vel, bounceCount: 0)]

        while t < maxSeconds && bounces <= 5 {
            let speed = vel.length
            let dragMag = 0.5 * rho * speed * speed * 0.42 * dragArea / mass
            let dragAcc = speed > 1e-5 ? vel * (-dragMag / speed) : Vec3(0, 0, 0)
            let acc = Vec3(dragAcc.x, dragAcc.y - g, dragAcc.z)

            vel = vel + acc * dt
            pos = pos + vel * dt
            t += dt

            if pos.y <= 0.0 {
                pos.y = 0.0
                if abs(vel.y) > 0.45 {
                    bounces += 1
                    vel.y = -vel.y * baseRestitution
                    vel.x *= 0.84
                    vel.z *= 0.84
                } else {
                    vel = Vec3(0, 0, 0)
                    samples.append(TrajectorySample(time: t, position: pos, velocity: vel, bounceCount: bounces))
                    break
                }
            }
            samples.append(TrajectorySample(time: t, position: pos, velocity: vel, bounceCount: bounces))
        }
        return samples
    }
}
