//
//  SpatialStudioApp.swift
//  SpatialStudioApp
//
//  macOS 14+ & iOS 17+ SwiftUI + Metal/SceneKit Interactive Studio HUD.
//

#if canImport(SwiftUI) && canImport(SceneKit)
import SwiftUI
import SceneKit
import SpatialGraphicsCore

@main
public struct SpatialStudioApp: App {
    public init() {}

    public var body: some Scene {
        WindowGroup("Twisted23 & Gravity Wizards — 3D Spatial Graphics Lab") {
            SpatialStudioRootView()
                .frame(minWidth: 920, minHeight: 620)
        }
    }
}

public struct SpatialStudioRootView: View {
    @StateObject private var coordinator = SpatialSceneCoordinator()
    @State private var cgFraction: Double = 0.68

    public init() {}

    public var body: some View {
        ZStack(alignment: .bottom) {
            SceneView(
                scene: coordinator.scene,
                pointOfView: coordinator.cameraNode,
                options: [.allowsCameraControl, .temporalAntialiasingEnabled]
            )
            .ignoresSafeArea()

            VStack(spacing: 12) {
                HStack(spacing: 14) {
                    Text("Top: \(coordinator.dieState.topPip) · South: \(coordinator.dieState.southPip) · East: \(coordinator.dieState.eastPip) (TF \(coordinator.dieState.tfCode))")
                        .font(.system(.subheadline, design: .monospaced).bold())
                    Spacer()
                    Toggle("3D-in-2D Orthographic", isOn: $coordinator.useOrthographic3DIn2D)
                        .toggleStyle(.switch)
                }

                HStack(spacing: 10) {
                    Picker("Axle-Lock", selection: Binding(
                        get: { coordinator.dieState.axleLock },
                        set: { coordinator.setAxleLock($0) }
                    )) {
                        ForEach(AxleLockMode.allCases, id: \.self) { mode in
                            Text(mode.rawValue).tag(mode)
                        }
                    }
                    .pickerStyle(.menu)

                    ForEach(RollCardinal.allCases, id: \.self) { dir in
                        Button("Roll \(dir.rawValue.capitalized)") {
                            coordinator.rollDie(dir)
                        }
                        .disabled(!coordinator.dieState.canRoll(dir))
                    }

                    Button("↻ Yaw 90°") {
                        coordinator.spinYaw()
                    }
                }

                HStack(spacing: 14) {
                    Text("FOBB 1/2\" Bearing CG:")
                        .font(.caption.bold())
                    Slider(value: $cgFraction, in: 0...1)
                        .onChange(of: cgFraction) { _, val in
                            coordinator.updateFOBBCG(fraction: val)
                        }
                    Button("📡 Fire 315MHz Key Fob (Bounce!)") {
                        coordinator.triggerWirelessFOBBHop()
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
            .padding(16)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .padding(16)
        }
    }
}
#else
import Foundation
import SpatialGraphicsCore

@main
public struct SpatialStudioCLI {
    public static func main() {
        var die = Die3DState(axleLock: .pin16)
        print("SpatialGraphicsCore Linux Headless Check — Initial TF: \(die.tfCode)")
        die.roll(.east)
        print("After Axle-Locked [1-6] East Roll -> Top=\(die.topPip), South=\(die.southPip), East=\(die.eastPip)")
        let samples = FOBBFlightSolver.simulate(FOBBLaunchConfig())
        print("Simulated \(samples.count) 120Hz FOBB frames; final bounce count = \(samples.last?.bounceCount ?? 0)")
    }
}
#endif
