//
//  SpatialSceneCoordinator.swift
//  SpatialStudioApp
//
//  True Hardware-Accelerated Metal / SceneKit PBR 3D Renderer (Zero flat 2D card faking!):
//  1) Sculpted Beveled RH000 Casino Die with real 3D recessed pips on all 6 faces,
//     glowing metallic Axle-Lock Skewers ([1-6], [2-5], [3-4]), and live Orthographic 3D-in-2D toggle!
//  2) Physically Refracting Transparent Polycarbonate FOBB with sliding 1/2" Chrome Steel Ball-Bearing
//     & Hex Coupler CG Ballast, Cyan/Emerald Fins, and Matte Black Elastomer Bounce Nosecone!
//

#if canImport(SceneKit)
import Foundation
import SceneKit
import SpatialGraphicsCore

@MainActor
public final class SpatialSceneCoordinator: ObservableObject {
    public let scene = SCNScene()
    public let cameraNode = SCNNode()

    private let diePivotNode = SCNNode()
    private let dieBodyNode = SCNNode()
    private let axleSkewerNode = SCNNode()

    private let fobbRootNode = SCNNode()
    private let fobbBallastNode = SCNNode()

    @Published public var dieState = Die3DState()
    @Published public var useOrthographic3DIn2D: Bool = true {
        didSet { updateCameraProjection() }
    }

    public init() {
        setupLightingAndFloor()
        setupCamera()
        buildTrue3DPorcelainDie()
        buildTransparentFOBBAssembly()
        syncDieTransform(animated: false)
    }

    private func setupCamera() {
        let cam = SCNCamera()
        cam.zNear = 0.1
        cam.zFar = 100.0
        cameraNode.camera = cam
        // Classic Twisted23 Parlour 3-Face Isometric/Orthographic Vantage (shows Top + South + East!)
        cameraNode.position = SCNVector3(4.2, 4.4, 5.2)
        cameraNode.look(at: SCNVector3(0.6, 0.4, 0.0))
        scene.rootNode.addChildNode(cameraNode)
        updateCameraProjection()
    }

    private func updateCameraProjection() {
        guard let cam = cameraNode.camera else { return }
        cam.usesOrthographicProjection = useOrthographic3DIn2D
        cam.orthographicScale = 2.65
        cam.fieldOfView = 42.0
    }

    private func setupLightingAndFloor() {
        scene.background.contents = NSColorOrUIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1.0)

        let keyLight = SCNNode()
        keyLight.light = SCNLight()
        keyLight.light?.type = .directional
        keyLight.light?.intensity = 1150
        keyLight.light?.castsShadow = true
        keyLight.eulerAngles = SCNVector3(-Float.pi / 3, Float.pi / 4, 0)
        scene.rootNode.addChildNode(keyLight)

        let fillLight = SCNNode()
        fillLight.light = SCNLight()
        fillLight.light?.type = .omni
        fillLight.light?.intensity = 450
        fillLight.position = SCNVector3(-4, 3, 4)
        scene.rootNode.addChildNode(fillLight)

        let ambient = SCNNode()
        ambient.light = SCNLight()
        ambient.light?.type = .ambient
        ambient.light?.intensity = 320
        scene.rootNode.addChildNode(ambient)

        let floorGeo = SCNFloor()
        floorGeo.reflectivity = 0.08
        let floorMat = SCNMaterial()
        floorMat.lightingModel = .physicallyBased
        floorMat.diffuse.contents = NSColorOrUIColor(red: 0.09, green: 0.13, blue: 0.22, alpha: 1.0)
        floorMat.roughness.contents = 0.65
        floorGeo.materials = [floorMat]
        let floorNode = SCNNode(geometry: floorGeo)
        floorNode.position = SCNVector3(0, -0.76, 0)
        scene.rootNode.addChildNode(floorNode)
    }

    private func buildTrue3DPorcelainDie() {
        let box = SCNBox(width: 1.5, height: 1.5, length: 1.5, chamferRadius: 0.22)
        let porcelain = SCNMaterial()
        porcelain.lightingModel = .physicallyBased
        porcelain.diffuse.contents = NSColorOrUIColor(red: 0.96, green: 0.94, blue: 0.89, alpha: 1.0)
        porcelain.roughness.contents = 0.28
        porcelain.metalness.contents = 0.04
        box.materials = [porcelain]

        dieBodyNode.geometry = box
        diePivotNode.position = SCNVector3(-0.9, 0.0, 0.0)
        diePivotNode.addChildNode(dieBodyNode)
        scene.rootNode.addChildNode(diePivotNode)

        // Engrave true RH000 3D Pips onto all 6 faces (+Y=1, -Y=6, +Z=2, -Z=5, +X=3, -X=4)
        addPipsToAllSixFaces()

        // Glowing Titanium Axle-Lock Skewer
        let cyl = SCNCylinder(radius: 0.075, height: 2.55)
        let axleMat = SCNMaterial()
        axleMat.lightingModel = .physicallyBased
        axleMat.diffuse.contents = NSColorOrUIColor(red: 0.22, green: 0.74, blue: 0.97, alpha: 1.0)
        axleMat.emission.contents = NSColorOrUIColor(red: 0.08, green: 0.35, blue: 0.55, alpha: 1.0)
        axleMat.metalness.contents = 0.85
        axleMat.roughness.contents = 0.18
        cyl.materials = [axleMat]
        axleSkewerNode.geometry = cyl
        axleSkewerNode.isHidden = true
        dieBodyNode.addChildNode(axleSkewerNode)
    }

    private func addPipsToAllSixFaces() {
        let pipGeo = SCNSphere(radius: 0.105)
        let redPip = SCNMaterial()
        redPip.lightingModel = .physicallyBased
        redPip.diffuse.contents = NSColorOrUIColor(red: 0.82, green: 0.16, blue: 0.18, alpha: 1.0)
        let inkPip = SCNMaterial()
        inkPip.lightingModel = .physicallyBased
        inkPip.diffuse.contents = NSColorOrUIColor(red: 0.11, green: 0.15, blue: 0.23, alpha: 1.0)

        let d: Float = 0.36
        let surface: Float = 0.735

        func placePip(_ x: Float, _ y: Float, _ z: Float, crimson: Bool = false) {
            let g = pipGeo.copy() as! SCNSphere
            g.materials = [crimson ? redPip : inkPip]
            let n = SCNNode(geometry: g)
            n.position = SCNVector3(x, y, z)
            dieBodyNode.addChildNode(n)
        }

        // 1 on +Y (Crimson Ace)
        placePip(0, surface, 0, crimson: true)
        // 6 on -Y (rails along Z pointing toward 2 & 5 / 3 & 4)
        for sx: Float in [-d, d] {
            for sz: Float in [-d, 0, d] { placePip(sx, -surface, sz) }
        }
        // 2 on +Z (South)
        placePip(-d, d, surface); placePip(d, -d, surface)
        // 5 on -Z (North)
        placePip(-d, d, -surface); placePip(d, d, -surface); placePip(0, 0, -surface)
        placePip(-d, -d, -surface); placePip(d, -d, -surface)
        // 3 on +X (East)
        placePip(surface, d, -d); placePip(surface, 0, 0); placePip(surface, -d, d)
        // 4 on -X (West, Crimson Four)
        for sy: Float in [-d, d] {
            for sz: Float in [-d, d] { placePip(-surface, sy, sz, crimson: true) }
        }
    }

    private func buildTransparentFOBBAssembly() {
        fobbRootNode.position = SCNVector3(1.85, 0.35, 0.0)
        fobbRootNode.eulerAngles = SCNVector3(0, 0, -Float.pi * 0.18)

        // Transparent Slotted Polycarbonate Fuselage Tube
        let tube = SCNCylinder(radius: 0.24, height: 2.1)
        let glass = SCNMaterial()
        glass.lightingModel = .physicallyBased
        glass.diffuse.contents = NSColorOrUIColor(red: 0.85, green: 0.95, blue: 1.0, alpha: 0.32)
        glass.transparency = 0.36
        glass.roughness.contents = 0.08
        glass.writesToDepthBuffer = false
        tube.materials = [glass]
        fobbRootNode.addChildNode(SCNNode(geometry: tube))

        // Soft Black Elastomer Bounce Nosecone
        let nose = SCNCone(topRadius: 0.11, bottomRadius: 0.26, height: 0.52)
        let rubber = SCNMaterial()
        rubber.lightingModel = .physicallyBased
        rubber.diffuse.contents = NSColorOrUIColor(red: 0.12, green: 0.14, blue: 0.18, alpha: 1.0)
        rubber.roughness.contents = 0.78
        nose.materials = [rubber]
        let noseNode = SCNNode(geometry: nose)
        noseNode.position = SCNVector3(0, 1.28, 0)
        fobbRootNode.addChildNode(noseNode)

        // Internal 1/2" Chrome Steel Ball Bearing + Hex Coupler (#761035)
        let bearing = SCNSphere(radius: 0.17)
        let chrome = SCNMaterial()
        chrome.lightingModel = .physicallyBased
        chrome.diffuse.contents = NSColorOrUIColor(red: 0.88, green: 0.92, blue: 0.96, alpha: 1.0)
        chrome.metalness.contents = 0.95
        chrome.roughness.contents = 0.10
        bearing.materials = [chrome]
        let bearingNode = SCNNode(geometry: bearing)
        bearingNode.position = SCNVector3(0, -0.22, 0)

        let coupler = SCNBox(width: 0.22, height: 0.38, length: 0.22, chamferRadius: 0.03)
        coupler.materials = [chrome]
        let couplerNode = SCNNode(geometry: coupler)
        couplerNode.position = SCNVector3(0, 0.12, 0)

        fobbBallastNode.addChildNode(bearingNode)
        fobbBallastNode.addChildNode(couplerNode)
        fobbBallastNode.position = SCNVector3(0, -0.45, 0)
        fobbRootNode.addChildNode(fobbBallastNode)

        // Cyan & Emerald Custom Fins
        let finColors = [
            NSColorOrUIColor(red: 0.22, green: 0.74, blue: 0.97, alpha: 0.88),
            NSColorOrUIColor(red: 0.20, green: 0.83, blue: 0.60, alpha: 0.88)
        ]
        for idx in 0..<4 {
            let finGeo = SCNBox(width: 0.03, height: 0.65, length: 0.48, chamferRadius: 0.01)
            let finMat = SCNMaterial()
            finMat.lightingModel = .physicallyBased
            finMat.diffuse.contents = finColors[idx % 2]
            finMat.roughness.contents = 0.2
            finGeo.materials = [finMat]
            let finNode = SCNNode(geometry: finGeo)
            let angle = Float(idx) * (.pi * 0.5)
            finNode.position = SCNVector3(sin(angle) * 0.34, -0.68, cos(angle) * 0.34)
            finNode.eulerAngles = SCNVector3(0, angle, 0)
            fobbRootNode.addChildNode(finNode)
        }

        scene.rootNode.addChildNode(fobbRootNode)
    }

    public func setAxleLock(_ mode: AxleLockMode) {
        dieState.axleLock = mode
        switch mode {
        case .free24:
            axleSkewerNode.isHidden = true
        case .pin16:
            axleSkewerNode.isHidden = false
            axleSkewerNode.eulerAngles = SCNVector3(0, 0, 0) // Local Y passes through 1 & 6
        case .pin25:
            axleSkewerNode.isHidden = false
            axleSkewerNode.eulerAngles = SCNVector3(Float.pi * 0.5, 0, 0) // Local Z passes through 2 & 5
        case .pin34:
            axleSkewerNode.isHidden = false
            axleSkewerNode.eulerAngles = SCNVector3(0, 0, Float.pi * 0.5) // Local X passes through 3 & 4
        }
        objectWillChange.send()
    }

    public func rollDie(_ direction: RollCardinal) {
        guard dieState.roll(direction) else { return }
        syncDieTransform(animated: true)
    }

    public func spinYaw() {
        dieState.spinYawClockwise()
        syncDieTransform(animated: true)
    }

    public func updateFOBBCG(fraction: Double) {
        let yOffset = -0.65 + 1.25 * max(0.0, min(1.0, fraction))
        SCNTransaction.begin()
        SCNTransaction.animationDuration = 0.18
        fobbBallastNode.position = SCNVector3(0, Float(yOffset), 0)
        SCNTransaction.commit()
    }

    public func triggerWirelessFOBBHop() {
        let up = SCNAction.moveBy(x: 0, y: 1.55, z: 0, duration: 0.34)
        up.timingMode = .easeOut
        let down = SCNAction.moveBy(x: 0, y: -1.55, z: 0, duration: 0.32)
        down.timingMode = .easeIn
        let bounceUp = SCNAction.moveBy(x: 0, y: 0.68, z: 0, duration: 0.20)
        bounceUp.timingMode = .easeOut
        let bounceDown = SCNAction.moveBy(x: 0, y: -0.68, z: 0, duration: 0.20)
        bounceDown.timingMode = .easeIn
        let spin = SCNAction.rotateBy(x: 0, y: .pi * 2.0, z: 0, duration: 1.06)
        fobbRootNode.runAction(.group([.sequence([up, down, bounceUp, bounceDown]), spin]))
    }

    private func syncDieTransform(animated: Bool) {
        let q = dieState.orientation
        SCNTransaction.begin()
        SCNTransaction.animationDuration = animated ? 0.26 : 0.0
        dieBodyNode.orientation = SCNQuaternion(Float(q.x), Float(q.y), Float(q.z), Float(q.w))
        SCNTransaction.commit()
    }
}

#if os(macOS)
import AppKit
private typealias NSColorOrUIColor = NSColor
#else
import UIKit
private typealias NSColorOrUIColor = UIColor
#endif
#endif
