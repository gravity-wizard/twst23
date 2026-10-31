//
//  Die_qx.swift
//  two3
//
//  Created by G on 11/29/19.
//  Copyright © 2019 akapps. All rights reserved.
//
//
//  Die.swift
//  two4
//
//  Created by G on 10/12/19.
//  Copyright © 2019 akapps. All rights reserved.
//
// bit up is direction 0/12:00

let b1t = 0b00000001 // north           1
let b2t = 0b00000010 // ne topRight     2
let b3t = 0b00000100 // east' right     4
let b4t = 0b00001000 // se bottomRight  8
let b5t = 0b00010000 // south' down     16
let b6t = 0b00100000 // sw downRight    32
let b7t = 0b01000000 // west left       64
let b8t = 0b10000000 // nw topLeft      128
// edge numbers are subtract one

enum Direction {
  case top
  case topRight
  case right
  case bottomRight
  case bottom
  case bottomLeft
  case left
  case topLeft
  case unknown
}
import UIKit

class Aura: UILabel {
  
  init() {
    super.init(frame: .zero)
    
    // z1alpha

  }
  required init?(coder: NSCoder) {
    fatalError("wrd Aura")
  }
  func layoutCustomGradient() {
    assert(frame != .zero)// layout needs frame
    let gradient = CAGradientLayer(
      start: .topLeft, end: .bottomRight,
      colors: [UIColor.blue.cgColor, UIColor.black.cgColor],
      type: .radial)
    gradient.frame = bounds
    layer.insertSublayer(gradient, at: 0)
  }
  func layoutCustomWood(grain: WoodGrain) {
//    tileCustomWood(grain)
    strechCustomWood(grain, cornered: nil)

  }
}
class DieZero: Die {}
class Die: UIButton {
//  class Die: CoolButton {
  
//  var gm_di: Game?

  var tt  = t0t // topText displayed
  var ttr = "letter"
  
  var dillz = z0z
  var ara = Aura()
  
  var ax = dash
  var AX = dash // from ax dictionary
  var NN = 0 // intFromAX
  
  var axTo = dash
  var toLLz = ""
  
  var diAngle: CGFloat = 0.0
  
  var iv = UIImageView()
  var dir8mask = 0b11111111
  //              12345678
  var dir8bels: [Arrbel] = []
  var dir8str = ""
  
  var isPrimary = false
  var isPlucked = false
  var slids = 0 // to shuffle
  
  //    var dir8user = 0b11111111
  var direction = Direction.unknown
  
  
  var r5row = "" // regionStrings
  var r5col = ""
  
  var didex = 0-1
  var dirow = 0-1
  var dicol = 0-1
  var h1z: [String] = [] // historyLLz
  
  var lastLocation = CGPoint(x: 0, y: 0)
  
  
    // below here needs initialization
  let diTxt: String? // 1intialText ==> hm
  let diTxtClr: UIColor?
  let diTxtClr1n = hidC0LR // 1ntial textColor
  let diBgc: UIColor?
  let diBgc1n = CCBLU.clearHex
//  let diBgc1n = CCBLU.brownSugar // 1ntial bgColor
  
  var hue: CGFloat {
    didSet {
      chkNeedsDisplay()
    }}
  var saturation: CGFloat {
    didSet {
      chkNeedsDisplay()
    }}
  var brightness: CGFloat {
    didSet {
      chkNeedsDisplay()
    }}
  
  // repeatProperties // 1nitialValues
  let diHue1n: CGFloat = 0.50
  let diBrt1n: CGFloat = 0.50
  let diSat1n: CGFloat = 0.50
  
  var  hm: String = "" // primaryIdentifier
  init(hm: String) {
    self.hm         = hm // primaryInitialized
    self.hue        = diHue1n
    self.saturation = diBrt1n
    self.brightness = diSat1n
    self.diTxt      = hm // primaryCopied__text
    self.diTxtClr   = diTxtClr1n
    self.diBgc      = diBgc1n.__uiColor() // 1nit
    
    super.init(frame:.zero) // superProperties
    backgroundColor = diBgc

    setTitle(diTxt, for: [])
    isOpaque = false
//    isUserInteractionEnabled = true
    
    alpha = z1alpha // soften die.alpha
    ara.alpha = z1alpha // tae
  }
  required init?(coder dieDecoder: NSCoder) {
    hue = 0.5
    saturation = 0.5
    brightness = 0.5
    diTxt      = hm
    diTxtClr   = diTxtClr1n
    diBgc = diBgc1n.__uiColor()
    super.init(coder: dieDecoder)
  }
  override func draw(_ rect: CGRect) {
    
    if !z1cool { return }
    
    guard let context = UIGraphicsGetCurrentContext() else {
      return
    }
    var actualBrightness = brightness
    
    if state == .highlighted {
      actualBrightness -= 0.1
    }
    
    let outerColor = UIColor(hue: hue, saturation: saturation, brightness: actualBrightness, alpha: 1.0)
    let shadowColor = UIColor(red: 0.2, green: 0.2, blue: 0.2, alpha: 0.5)
    
    let outerMargin: CGFloat = 5.0
    let outerRect = rect.insetBy(dx: outerMargin, dy: outerMargin)
    let outerPath = createRoundedRectPath(for: outerRect, radius: 6.0)
    
    if state != .highlighted {
      context.saveGState()
      context.setFillColor(outerColor.cgColor)
      context.setShadow(offset: CGSize(width: 0, height: 2), blur: 3.0, color: shadowColor.cgColor)
      context.addPath(outerPath)
      context.fillPath()
      context.restoreGState()
    }
    
    // Outer Path Gloss & Gradient
    let outerTop = UIColor(hue: hue, saturation: saturation, brightness: actualBrightness, alpha: 1.0)
    let outerBottom = UIColor(hue: hue, saturation: saturation, brightness: actualBrightness * 0.8, alpha: 1.0)
    
    context.saveGState()
    context.addPath(outerPath)
    context.clip()
    drawGlossAndGradient(context: context, rect: outerRect, startColor: outerTop.cgColor, endColor: outerBottom.cgColor)
    context.restoreGState()
    
    // Inner Path Gloss & Gradient
    let innerTop = UIColor(hue: hue, saturation: saturation, brightness: actualBrightness * 0.9, alpha: 1.0)
    let innerBottom = UIColor(hue: hue, saturation: saturation, brightness: actualBrightness * 0.7, alpha: 1.0)
    
    let innerMargin: CGFloat = 3.0
    let innerRect = outerRect.insetBy(dx: innerMargin, dy: innerMargin)
    let innerPath = createRoundedRectPath(for: innerRect, radius: 6.0)
    
    context.saveGState()
    context.addPath(innerPath)
    context.clip()
    drawGlossAndGradient(context: context, rect: innerRect, startColor: innerTop.cgColor, endColor: innerBottom.cgColor)
    context.restoreGState()
  }
  
  @objc func hesitateUpdate() {
    chkNeedsDisplay()
  }
  override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
    super.touchesBegan(touches, with: event)
    chkNeedsDisplay()
  }
  override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
    super.touchesMoved(touches, with: event)
    chkNeedsDisplay()
  }
  override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
    super.touchesCancelled(touches, with: event)
    chkNeedsDisplay()
    perform(#selector(hesitateUpdate), with: nil, afterDelay: 0.1)
  }
  override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
    super.touchesEnded(touches, with: event)
    chkNeedsDisplay()
    perform(#selector(hesitateUpdate), with: nil, afterDelay: 0.1)
  }
  
    override func layoutSubviews() {
    super.layoutSubviews()
    diCustomize()
  }
  func resetDi(game: Game) {
    game.plck = nil
    isPrimary = false
    isSelected = false
    resetDi(soon: 0.311)
  }
  func resetDi(soon: Double) {
    DispatchQueue.main.asyncAfter( //delayRaw
    deadline: .now() + soon) {
      self.diLook(.diSel)
    }
  }
}

//    @objc func detectPan(_ recognizer:UIPanGestureRecognizer) {
//        let translation  = recognizer.translation(in: self.superview)
//
//        let threshold = self.bounds.size.width/2
//
//        direction = .unknown
//
//            if (translation.x > threshold) {
//            if (translation.y > threshold) {
//                direction = Direction.bottomRight;
//            } else if (translation.y < -threshold) {
//                direction = Direction.topRight
//            } else {
//                direction = Direction.right
//            }
//        } else if (translation.x < -threshold) {
//            if (translation.y > threshold) {
//                direction = Direction.bottomLeft;
//            } else if (translation.y < -threshold) {
//                direction = Direction.topLeft
//            } else {
//                direction = Direction.left
//            }
//        } else {
//            if (translation.y > threshold) {
//                direction = Direction.bottom
//            } else if (translation.y < -threshold) {
//                direction = Direction.top
//            }
//        }
//
//        if direction != .unknown {
//            print("drag8dir", direction)
//            NotificationCenter.default.post(name:NN.dir8delta, object: self)
//        }
//
//        self.center = CGPoint(x: lastLocation.x + translation.x,
//                              y: lastLocation.y + translation.y)
//        ara.center = center
//    }
//    override func touchesBegan(
//        _ touches: Set<UITouch>,
//        with event: UIEvent?) {
//        // Promote the touched view
//        ara.superview?.bringSubviewToFront(ara)
//        self.superview?.bringSubviewToFront(self)
//        // Remember original location
//        lastLocation = self.center
//    }

extension Die {
  func dieInitStyle(dex: Int) {
    didex = dex
    //        tt = String(didex + 1)
    ara.text = dillz
    tag = G0base.die.rawValue + didex + 1
//    setTitleColor(.white, for: [] )
//    titleLabel?.font =
//      UIFont.systemFont(ofSize: fnt.szDI)
  }
  func dieFinishStlyeFor(game: Game) {
    
    if game is Game_X_ {
      ax = didex.axFromDex()
      AX = axDict[ax]!
    } else { ax = hm.axFromLLz(
      wide: game.ecHorizontal)
      AX = Character(String(ax).uppercased())
    }
    ttr = String(ax)
    NN = AX.intFromAX()
//    tt = String(AX)
    
    tt = String(NN + 1)
        
    let pnd = slids.intToChar() // appendage
    if z1i > zrv(.xtra) { tt += String(pnd) }
    //    tt = String(NN)
    //    tt += String(ax)
    setTitle(tt, for: [])
    
  }
}

extension ChildVC { //c.frame.size.height = sh.pwr(cisf) {
  func seekDi(dex: Int, dyce: [Die]) -> Die {
//    print("skDiDex", dex)
    assert(dyce.count > 0)
    var dye: Die?
    var found = 0
    
    for d in dyce {
      if d.didex != dex { continue }
      dye = d
      found += 1
    }
    assert(found == 1)
    return dye!
  }
  func seekDi(llz: String, dyce: [Die]) -> Die? {
    print("skDiLLz", llz)
    
    var dye: Die?
    var found = 0
    
    for d in dyce {
      if d.dillz != llz { continue }
      dye = d
      found += 1
    }
    assert(found <= 1)
    return dye
  }
}
extension Die {
  func diLook(_ how: M0DLookDi) {
    switch how {
      case .diNeg0i:  diNeg0iAct()
      case .diNeg4v:  diNeg4vAct()
      case .diPos0i:  diPos0iAct()
      case .diPos4v:  diPos4vAct()
      case .diSel: break
    }
    diSelectedAct()
    if zck(.dbug) == false {
      ara.text = ""
    }
  }
  func diSelectedAct() {
//    if dillz.contains(dash) { // hide negative
//      alpha = z1i >= zrv(.xtra)    ? 0.3 : 0.0
//      ara.alpha = z1i > zrv(.xtra) ? 0.4 : 0.0
//      return }
//    alpha = 0.777
    isSelected ? lookSel() : lookUn()
  }
  func lookSel() {
//    ara.alpha = 0.55125
//    ara.textColor = .gray
  }
  func lookUn() {
//    ara.alpha = 0.45125
//    ara.textColor = .clear
  }
  func diNeg0iAct() {
    diAngle = 0.0
//    bgc(.purple)
//    ara.bgc(.black)
    //    tag = 0 - abs(tag) // makeNegative
    transform = .identity
    ara.transform = .identity
    
//    isHidden = !ovrHIDE
//    ara.isHidden = !ovrHIDE
    
  }
  func diNeg4vAct() {
    diNeg0iAct()
    diAngle = ang4v_o
    ara.transform = .init(rotationAngle: ang4v_o.cgRadians())
  }
  func diPos0iAct() {
    diAngle = 0.0
    transform = .identity
    ara.transform = .identity
    
  }
  func diPos4vAct() {
    diPos0iAct()
    diAngle = ang4v_o
    ara.transform = .init(rotationAngle: ang4v_o.cgRadians())
  }
}
extension ChildVC {
  func rotate(dyce: [Die]) {
    for d in dyce {
      let zl = String(d.dillz.last!)
      let znum = zl.toInt() - 1
//                  print("rtd", d.dillz, zl, znum)
      
      if znum < 0 { d.diLook(.diNeg4v) }
      if znum > 0 { d.diLook(.diPos4v) }
      assert(abs(znum) == 1)
    }
    
  }
  func homeDice(whare: M0DHomeWhere,
//                game: Game,
                cyce: [Cie],
                dyce: [Die]) {
    let game = gm
    var whare7 = whare // notHome iff setZero
    if game.prcntHoles > 0 { whare7 = .enPositive }
    if game.prcntHoles == 1 { game.shuffleDice = false }
    if game.shuffleDice {
      //            dyce = dyce.shuffled()
    }
    var cyce:[Cie]?
    for d in dyce {
      switch whare7 {
        case .dontHome: return /// X
        case .enPositive: cyce = psCice // p
        case .enNegative: cyce = nsCice // n
      }
      let fromCie =
        seekCie(llz:
          d.dillz, in: psCice + nsCice)
      let homeCie =
        seekCieLL(d.hm, in: cyce!)
      d.relocateTo(homeCie!, fromCie)
      d.slids = 0
    }
  }
  func makeHoles(cyce: [Cie], dyce: [Die]) {
    //        var whare7: M0DHomeWhere = .dontHome // notHome iff setZero
    //        if game.prcntHoles > 0 { whare7 = .enPositive }
    var startHoles = dyce.count * gm.prcntHoles/100
    if gm.prcntHoles == 1 { startHoles = 1 }
    for n in 0..<startHoles {
      let n7 = (startHoles == 1) ? dyce.count - 1 : n
      
      let d = dyce[n7]
      
      let fromCie = seekCie(llz:
        d.dillz, in: psCice + nsCice)
      
      
      let homeCie =
        seekCieLL(d.hm, in: nsCice)
      
      homeCie!.backgroundColor = hidC0LR4mag
      
      d.relocateTo(homeCie!, fromCie)
    }} // starts solved with the
  // last cie empty if startHoles == 1, ie 15 or 23
}
extension Die {
  func relocateTo(_ toCie: Cie,
                  _ from: Cie,
                  f:String=#function) {
    assert(from.tts.count > 0)
//    print(f, self.ax, "from", from.hm, from.ciax)
//    print(f, self.ax, "toCie", toCie.hm, toCie.ciax)
    
    if ax == toCie.ciax { toCie.ciax = dash } // redo
    
    if toCie.ciax == from.ciax {
      toCie.ciax = dash } // restoration
    assert(toCie.ciax == dash) // isEmpty
    from.tts = [t0t] /// critical
    from.ciax = dash
    
    let o0 = toCie.superview!.frame.origin
    let nwx = toCie.center.x //+ o0.x
    let nwy = toCie.center.y + o0.y
    let nwcntr = CGPoint(x: nwx, y: nwy)
    
    center = toCie.hm.contains(dash) ? nwcntr : toCie.center
//    center = nwcntr
//    center = toCie.center
    
    
    ara.center = center
    dillz = toCie.hm
    h1z.append(dillz)
    
    if dillz.contains(dash) {
      tag = 0 - abs(tag)// makeNegative
    } else { tag = abs(tag) } // makePositive
    
    
    toCie.ciax = ax
    //    print("toCie.ax, dillz", ax, dillz)
    
    toCie.tts = [tt]
    assert(toCie.tts.count == 1)
  }
}
//MARK: assignTarget
extension Die {
  func assignDie(target: UIViewController) {
    self.addTarget(
      target,
      action: #selector(
        (target as! ChildVC).diDidTap(sndr: )),
      for: .touchUpInside)
  }}
extension ChildVC {
  @objc func diDidTap(sndr: Die) {
    
    sndr.dimOnTap()
    
    if !okClick(die: sndr) { return }
    sndr.isPlucked = true
    sndr.toggleButton(sndr)
    sndr.diLook(.diSel)
    
    gui(sndr.tt)
    _ = diSimTap(sndr: sndr)
  }
  
  func diSimTap(
    sndr: Die,
    u: String = #function) -> Bool {
    let u2 = #function; print(u2, u, sndr.ax)
    if sndr.isSelected {
      gm.plck = sndr // only if real click qst
    } else { gm.plck = nil }
    return initMoveDi(plck: gm.plck, psCice, dice)!
  }
  func okClick(die: Die) -> Bool {
    
    if gm.mixed == .none
      && !disableSHUFFLE { return false }
    
    if gm.state == .solved {
      return false
    }
    
    if die.isSelected { return true }
    let other =
      seekSel(dyce: dice)
    
    if other.isEmpty { return true }
//    assert(other.count == 1)
    if other.count != 1 { gui("wrd other") }
    
    if !gm.okToSwapDice { return false }
    
    let one = other.first
//    assert(one == gm.plck)
    if one != gm.plck { gui("wrd one") }
    one?.isSelected = false
    one?.diLook(.diSel)
    return true
  }
  func seekSel(dyce:[Die]) -> [Die] {
    var dieArr:[Die] = []
    for (i,d) in dyce.enumerated() {
      if !gm.shuffleDice { assert(d.didex == i) }//shuffle
      d.diLook(.diSel)
      if !d.isSelected { continue }
      let s =
        seekDi_tt(d.tt, in: dyce)
      if !gm.shuffleDice { assert(s.didex == i) }
      dieArr.append(d)
    }
    return dieArr
  }}
extension ChildVC {
  func seekDi_tt(_ tt: String, in dyce:[Die]) -> Die {
    
    var dye: Die?
    var found = 0
    
    for (i,d) in dyce.enumerated() {
      if !gm.shuffleDice { assert(d.didex == i) }
      if d.tt != tt { continue }
      dye = d
      found += 1
    }
    assert(found == 1)
    return dye!
  }
  func seekDiPos_ax(_ char: Character,
                    in dyce:[Die],
                    f:String=#function) -> Die {
    var dye: Die?
    var q = 0
    for (i,d) in dyce.enumerated() {
      assert(d.didex == i)
      if d.ax != char { continue }
      if d.dillz.contains(dash) {
        dye = DieZero(hm: "" )
//        dye = DieZero(coder: NSCoder())
        q += 1
        continue
      } // noNegatives
      q += 1
      dye = d
    }
    if char == dash {
      q += 1
      dye = DieZero(hm: "" )
//      dye = DieZero(coder: NSCoder())
      //      dye = Die()
      //      dye!.tt = "_"
    }
    
    if q == 0 { print("wrdf0", f) }
    assert(q==1)
    return dye!
  }
}
//extension Die {
func ttToAX(_ tt: String) -> Character {
  assert(tt.count <= 2)
  if tt == String(dash) {
    
    return dash
  }
  return tt.toInt().intToCHAR()
}
//}
extension ChildVC {
  func seekCi_ax(_ ax: Character,
                 _ cyce:[Cie],
                 f:String=#function) -> Cie {
    var q = 0, cye:Cie?
    for c in cyce {
      if c.ciax != ax { continue }
      q += 1
//      print(f, "cq+", q, c.hm, ax)
      cye = c
    }
    assert(q==1); return cye!
  }
  func seekCiceAX(_ ax: Character,
                  _ cyce:[Cie],
                  f:String=#function) -> [Cie] {
    var res:[Cie] = []
    for c in cyce {
      if c.ciax != ax { continue }
      //            print(f, "cq+", c.hm, ax)
      res.append(c)
    }
    return res
  }
}

extension ChildVC {
  func simClick(ax: Character,
                l:Int=#line,
                f:String=#function) {
    let clkDie = seekDiPos_ax(ax, in: dice)
    if clkDie is DieZero { return }
    clkDie.isPrimary = true
    _ = initMoveDi(plck: clkDie, psCice, dice)
  }
  func slideNextDieIn(
    _ cyce: [Cie],
    _ dyce: [Die]) {
    if gm.mixFig == 0 { gm.counter = 0; return }
    
    gm.counter += 1
    gm.dwarp = gm.warp0 * Double(gm.counter)
    
    var next:Die?
    if fewest(dyce) > 0 {
      for d in dyce {
        if d.dillz == cyce[gm.dashDex0!].hm {
          next = d
          if next!.dir8mask == 0 { break }
          gm.mixed = .last
          gm.slids = gm.slidsMax
          d.dieFinishStlyeFor(game: gm)
          simClick(ax: next!.ax)
          return
        }
      }
    }
    gm.sortedDyce = gm.sortBySlids(dyce: dyce)
    
    var possible = 0
    
    for d in gm.sortedDyce! {
      if d.dillz.contains(dash) { continue } // neg
      if d.dir8mask == 0 { continue } // can't slide
      
      possible += 1
      // 5050 chance
      if Bool.random() { continue }
      next = d
      d.dieFinishStlyeFor(game: gm)
      break
    }
    if next == nil {
      if possible < 1 {
        possible.ui("poss")
        if gm.ckMaxTries() {
          gm.slids = 01041820
          print("abrt")
//          view.fbgc(.abort)
          psGrid.fbgc(.abort)
        }}
      if gm.slids < gm.slidsMax {
        if fewest(dyce) > 1 { gm.slids += 1 }
        
        slideNextDieIn(cyce, dyce)
        return
      }
      return
    }
    simClick(ax: next!.ax)
  }
}
func fewest(_ dyce: [Die]) -> Int {
  var fewest = 99
  for d in dyce {
    if d.dillz.contains(dash) { continue }
    fewest = min(fewest, d.slids)
  }
  return fewest
}

protocol DieCustomMethods: class {
  func diCustomize()
  
}
extension Die: DieCustomMethods {
  func diCustomize() {
//    let u=#function
//    print(u, hm, dillz, ax, AX, "tst")

//    clipsToBounds = true
    if frame.size != .zero {
      // scale and propagate number size
      FontSize.digits = sizedFont(.dinCond).pointSize
      titleLabel!.font = sizedFont(.dinCond)
      
      let isLite = u5vLightColors
      let liteBGC = CCBLU.beige.__uiColor()
      let darkBGC = UIColor.clear // CCBLU.brownSugar.__uiColor()
      
      // comment out to only use white numbers qst?
      setTitleColor(isLite ? .black : .black, for: [])
//      ara.layoutCustomWood(grain: isLite ?  .wgLite : .wgDark)
      ara.backgroundColor = isLite ?  liteBGC : darkBGC // overrides woodgrain
      
      
      ara.cornerRadiusRatio(nil)
      
      // functions here cannot be changed on click, etc.
//      alpha = z1alpha // soften die.alpha
//      ara.alpha = z1alpha // tae
      //      titleLabel?.baselineAdjustment = .alignCenters
      adjustImageAndTitleOffsetsFor(button: self)
    }
  }
}
// center text vertically
private func adjustImageAndTitleOffsetsFor(button: UIButton) {
  
  let spacing: CGFloat = 16.0
  
  let imageSize = button.imageView!.frame.size
  
  button.titleEdgeInsets = UIEdgeInsets(
    top: 0, left: -imageSize.width,
    bottom: -(imageSize.height + spacing), right: 0)
  
  let titleSize = button.titleLabel!.frame.size
  
  button.imageEdgeInsets = UIEdgeInsets(
    top: -(titleSize.height + spacing), left: 0,
    bottom: 0, right: -titleSize.width)
}
