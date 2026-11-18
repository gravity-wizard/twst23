//
//  AxleLockedDie3D.swift
//  SpatialGraphicsCore
//
//  Pure cross-platform Swift 6 3D rotation & quaternion engine for the 24-state S4
//  Western Right-Handed Casino Die (RH000, opposite faces sum to 7) + Axle-Locking
//  ([1-6], [2-5], [3-4] skewers restricting tumbles to exact 4-face rings).
//

import Foundation

/// Optional bicycle-axle skewer pinning two opposite faces (which always sum to 7).
public enum AxleLockMode: String, CaseIterable, Codable, Sendable {
    case free24 = "Free 24-State S4"
    case pin16  = "Axle [1-6] -> Rolls {2,3,4,5}"
    case pin25  = "Axle [2-5] -> Rolls {1,3,6,4}"
    case pin34  = "Axle [3-4] -> Rolls {1,2,6,5}"

    /// The pinned pip pair (if any) through which the 3D metallic axle passes.
    public var pinnedPair: (Int, Int)? {
        switch self {
        case .free24: return nil
        case .pin16:  return (1, 6)
        case .pin25:  return (2, 5)
        case .pin34:  return (3, 4)
        }
    }
}

/// Cardinal board-space tumble directions (+Z = South/Toward Viewer, -Z = North, +X = East, -X = West, +Y = Top).
public enum RollCardinal: String, CaseIterable, Codable, Sendable {
    case north, east, south, west
}

/// Lightweight cross-platform 3D vector & unit quaternion (compiles on Linux SSH VM & Apple Metal/SceneKit).
public struct Vec3: Equatable, Hashable, Codable, Sendable {
    public var x: Double
    public var y: Double
    public var z: Double

    public init(_ x: Double, _ y: Double, _ z: Double) {
        self.x = x; self.y = y; self.z = z
    }

    public var length: Double { (x * x + y * y + z * z).squareRoot() }

    public var normalized: Vec3 {
        let len = length
        guard len > 1e-9 else { return Vec3(0, 1, 0) }
        return Vec3(x / len, y / len, z / len)
    }

    public static func + (lhs: Vec3, rhs: Vec3) -> Vec3 { Vec3(lhs.x + rhs.x, lhs.y + rhs.y, lhs.z + rhs.z) }
    public static func - (lhs: Vec3, rhs: Vec3) -> Vec3 { Vec3(lhs.x - rhs.x, lhs.y - rhs.y, lhs.z - rhs.z) }
    public static func * (lhs: Vec3, rhs: Double) -> Vec3 { Vec3(lhs.x * rhs, lhs.y * rhs, lhs.z * rhs) }
}

public struct Quat: Equatable, Hashable, Codable, Sendable {
    public var x: Double
    public var y: Double
    public var z: Double
    public var w: Double

    public static let identity = Quat(x: 0, y: 0, z: 0, w: 1)

    public init(x: Double, y: Double, z: Double, w: Double) {
        self.x = x; self.y = y; self.z = z; self.w = w
    }

    public static func axisAngle(axis: Vec3, radians: Double) -> Quat {
        let n = axis.normalized
        let half = radians * 0.5
        let s = sin(half)
        return Quat(x: n.x * s, y: n.y * s, z: n.z * s, w: cos(half)).normalized
    }

    public var normalized: Quat {
        let len = (x * x + y * y + z * z + w * w).squareRoot()
        guard len > 1e-9 else { return .identity }
        return Quat(x: x / len, y: y / len, z: z / len, w: w / len)
    }

    public static func * (a: Quat, b: Quat) -> Quat {
        Quat(
            x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
            y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
            z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
            w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
        ).normalized
    }

    public func rotate(_ v: Vec3) -> Vec3 {
        let qv = Quat(x: v.x, y: v.y, z: v.z, w: 0)
        let conj = Quat(x: -x, y: -y, z: -z, w: w)
        let r = self * qv * conj
        return Vec3(r.x, r.y, r.z)
    }

    /// Smooth spherical linear interpolation for 60/120fps GPU die tumbles.
    public static func slerp(_ q0: Quat, _ q1: Quat, t: Double) -> Quat {
        let clamped = max(0.0, min(1.0, t))
        var dot = q0.x * q1.x + q0.y * q1.y + q0.z * q1.z + q0.w * q1.w
        var end = q1
        if dot < 0 {
            dot = -dot
            end = Quat(x: -q1.x, y: -q1.y, z: -q1.z, w: -q1.w)
        }
        if dot > 0.9995 {
            return Quat(
                x: q0.x + clamped * (end.x - q0.x),
                y: q0.y + clamped * (end.y - q0.y),
                z: q0.z + clamped * (end.z - q0.z),
                w: q0.w + clamped * (end.w - q0.w)
            ).normalized
        }
        let theta0 = acos(dot)
        let theta = theta0 * clamped
        let sinTheta = sin(theta)
        let sinTheta0 = sin(theta0)
        let s0 = cos(theta) - dot * sinTheta / sinTheta0
        let s1 = sinTheta / sinTheta0
        return Quat(
            x: s0 * q0.x + s1 * end.x,
            y: s0 * q0.y + s1 * end.y,
            z: s0 * q0.z + s1 * end.z,
            w: s0 * q0.w + s1 * end.w
        ).normalized
    }
}

/// Exact 24-state S4 RH000 Die State paired with its exact 3D unit quaternion for real GPU rendering.
public struct Die3DState: Equatable, Sendable {
    public var orientation: Quat
    public var axleLock: AxleLockMode

    /// Canonical local outward face normals for a Western Right-Handed Casino Die (RH000):
    /// +Y = 1, -Y = 6 | +Z (South/Front) = 2, -Z (North/Back) = 5 | +X (East/Right) = 3, -X (West/Left) = 4.
    /// Check chirality: 1 (+Y) -> 2 (+Z) -> 3 (+X) runs counter-clockwise around (+1,+1,+1)!
    public static let localFaceNormals: [(pip: Int, normal: Vec3)] = [
        (1, Vec3( 0,  1,  0)),
        (6, Vec3( 0, -1,  0)),
        (2, Vec3( 0,  0,  1)),
        (5, Vec3( 0,  0, -1)),
        (3, Vec3( 1,  0,  0)),
        (4, Vec3(-1,  0,  0))
    ]

    public init(orientation: Quat = .identity, axleLock: AxleLockMode = .free24) {
        self.orientation = orientation
        self.axleLock = axleLock
    }

    /// World-space face normal for any pip (1...6).
    public func worldNormal(forPip pip: Int) -> Vec3 {
        guard let entry = Self.localFaceNormals.first(where: { $0.pip == pip }) else {
            return Vec3(0, 1, 0)
        }
        return orientation.rotate(entry.normal)
    }

    /// Returns which pip currently points along a world axis (+Y = Top, +Z = Front/South, +X = Right/East).
    public func pipFacing(_ worldDir: Vec3) -> Int {
        let dir = worldDir.normalized
        var bestPip = 1
        var bestDot = -Double.infinity
        for entry in Self.localFaceNormals {
            let wn = orientation.rotate(entry.normal)
            let d = wn.x * dir.x + wn.y * dir.y + wn.z * dir.z
            if d > bestDot {
                bestDot = d
                bestPip = entry.pip
            }
        }
        return bestPip
    }

    public var topPip: Int    { pipFacing(Vec3( 0,  1,  0)) }
    public var bottomPip: Int { pipFacing(Vec3( 0, -1,  0)) }
    public var southPip: Int  { pipFacing(Vec3( 0,  0,  1)) }
    public var northPip: Int  { pipFacing(Vec3( 0,  0, -1)) }
    public var eastPip: Int   { pipFacing(Vec3( 1,  0,  0)) }
    public var westPip: Int   { pipFacing(Vec3(-1,  0,  0)) }

    /// Twisted23 compact two-digit Top-Front (TF) code, e.g. Top=1, South=2 -> 12.
    public var tfCode: Int { topPip * 10 + southPip }

    /// World-space axis of the Axle-Lock skewer (if active).
    public var worldAxleAxis: Vec3? {
        guard let pair = axleLock.pinnedPair else { return nil }
        return worldNormal(forPip: pair.0).normalized
    }

    /// Checks whether a 90° cardinal roll is permitted under the active Axle-Lock skewer.
    /// A roll around `worldRollAxis` is legal iff `axleLock == .free24` OR the pinned axle is parallel to `worldRollAxis`!
    public func canRoll(_ direction: RollCardinal) -> Bool {
        guard let axle = worldAxleAxis else { return true }
        let rollAxis = Self.worldRollAxis(for: direction)
        let alignment = abs(axle.x * rollAxis.x + axle.y * rollAxis.y + axle.z * rollAxis.z)
        return alignment > 0.95
    }

    public static func worldRollAxis(for direction: RollCardinal) -> Vec3 {
        switch direction {
        case .north: return Vec3(-1, 0,  0) // Top (+Y) tips toward -Z
        case .south: return Vec3( 1, 0,  0) // Top (+Y) tips toward +Z
        case .east:  return Vec3( 0, 0, -1) // Top (+Y) tips toward +X
        case .west:  return Vec3( 0, 0,  1) // Top (+Y) tips toward -X
        }
    }

    /// Applies a 90° cardinal roll if permitted by the Axle-Lock skewer.
    @discardableResult
    public mutating func roll(_ direction: RollCardinal) -> Bool {
        guard canRoll(direction) else { return false }
        let step = Quat.axisAngle(axis: Self.worldRollAxis(for: direction), radians: .pi * 0.5)
        orientation = (step * orientation).normalized
        return true
    }

    /// Spins 90° clockwise in yaw around world +Y (used to align an Axle-Locked die's skewer N/S vs E/W).
    public mutating func spinYawClockwise() {
        let yaw = Quat.axisAngle(axis: Vec3(0, -1, 0), radians: .pi * 0.5)
        orientation = (yaw * orientation).normalized
    }
}
