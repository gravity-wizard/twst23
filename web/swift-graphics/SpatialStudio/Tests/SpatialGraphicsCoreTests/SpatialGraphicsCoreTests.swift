import XCTest
@testable import SpatialGraphicsCore

final class SpatialGraphicsCoreTests: XCTestCase {
    func testOppositeSevenAndRH000Chirality() {
        let die = Die3DState()
        XCTAssertEqual(die.topPip + die.bottomPip, 7)
        XCTAssertEqual(die.southPip + die.northPip, 7)
        XCTAssertEqual(die.eastPip + die.westPip, 7)
        XCTAssertEqual(die.topPip, 1)
        XCTAssertEqual(die.southPip, 2)
        XCTAssertEqual(die.eastPip, 3)
    }

    func testAxleLockPin16RestrictsTo2345Ring() {
        var die = Die3DState(axleLock: .pin16)
        // Skewer is currently vertical (+Y/-Y through 1 & 6), so cardinal horizontal rolls are blocked until yawed or tilted:
        XCTAssertFalse(die.canRoll(.north))
        XCTAssertFalse(die.canRoll(.east))

        // Place [1-6] skewer along East-West (+X/-X) by rolling Free first, then locking [1-6]:
        var rolling = Die3DState(axleLock: .free24)
        rolling.roll(.east) // Now 1 is on East (+X), 6 is on West (-X), 4 is on Top!
        rolling.axleLock = .pin16

        XCTAssertTrue(rolling.canRoll(.north))
        XCTAssertTrue(rolling.canRoll(.south))
        XCTAssertFalse(rolling.canRoll(.east))
        XCTAssertFalse(rolling.canRoll(.west))

        var seenTops = Set<Int>()
        for _ in 0..<4 {
            seenTops.insert(rolling.topPip)
            XCTAssertTrue(rolling.roll(.north))
        }
        XCTAssertEqual(seenTops, Set([2, 3, 4, 5]))
    }

    func testFOBBFlightProducesSafeBounces() {
        let cfg = FOBBLaunchConfig(counterweightKg: 7.5, dropHeightMeters: 1.6, launchAngleDegrees: 52)
        let samples = FOBBFlightSolver.simulate(cfg)
        XCTAssertGreaterThan(samples.count, 50)
        XCTAssertGreaterThanOrEqual(samples.last?.bounceCount ?? 0, 1)
    }
}
