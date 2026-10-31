//
//  Cie_qx.swift
//  two3
//
//  Cie.swift
//  two4
//  Created by G on 10/12/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import UIKit
class Cie: UIButton {
  // hm as primaryIdentifier
  var tts = [t0t] // topText of resident di(c)e
  var lbl = UILabel()
  var cidex = 0-1
  var ciax = dash
  
  var cirow = 0-1
  var cicol = 0-1
  var zdim  = 0-1
  
  var xyzArr: [Int] = []
  var cp0i = CGPoint.zero
  var cp00 = CGPoint.zero
  var cp4v = CGPoint.zero
  
  // below here needs initialization
  let ciTxt: String? // 1intialText ==> hm
  let ciTxtClr: UIColor?
  let ciTxtClr1n = hidC0LR // 1ntial textColor
  let ciBgc: UIColor?
  let ciBgc1n = CCBLU.brownSugar // 1ntial bgColor
  
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
  let ciHue1n: CGFloat = 0.50
  let ciBrt1n: CGFloat = 0.50
  let ciSat1n: CGFloat = 0.50
  
  var  hm: String = "" // primaryIdentifier
  init(hm: String) {
    self.hm         = hm // primaryInitialized
    self.hue        = ciHue1n
    self.saturation = ciBrt1n
    self.brightness = ciSat1n
    self.ciTxt      = hm // primaryCopied__text
    self.ciTxtClr   = ciTxtClr1n
    self.ciBgc      = ciBgc1n.__uiColor() // 1nit
    
    super.init(frame:.zero) // superProperties
    backgroundColor = ciBgc
    lbl.textColor = ciTxtClr
    setTitle(ciTxt, for: [])
    
//    alpha = 1.0 // cie.alpha
    alpha = z1alpha // soften
    
    isOpaque = false
  }
  required init?(coder cieDecoder: NSCoder) {
    hue = 0.5
    saturation = 0.5
    brightness = 0.5
    ciTxt      = hm
    ciTxtClr   = ciTxtClr1n
    ciBgc = ciBgc1n.__uiColor()
    super.init(coder: cieDecoder)
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
  
  func cieInitStyleNeg(dex: Int) {
    cidex = dex
    tag = 0 - (G0base.cie.rawValue + cidex + 1)
    lbl.tag = 0 - (G0base.label.rawValue + cidex + 1)
  }
  func cieInitStylePos(dex: Int) {
    cidex = dex
//    lbl.cornerRadiusRatio(nil) frm0
    tag = 0 + (G0base.cie.rawValue + cidex + 1)
    lbl.tag = 0 + (G0base.label.rawValue + cidex + 1)
  }
}

extension Cie {
  func ciLo(
    _ how:M0DLookCi,
    vw: Pivot,
    u: String = #function) {
    //    gui(#function + u + hm)
    switch how {
      case .ciNeg0i:      ciNeg0iAct(vw)
      case .ciNeg4v:      ciNeg4vAct(vw)
      case .ciPos0i:      ciPos0iAct(vw)
      case .ciPos4v:      ciPos4vAct(vw)
      case .ciSel:        break
    }
    
    ciSelectedAct()
    
    if zck(.dbug) == false {
      //            lbl.text = ""
      setTitle("", for: [])
    } else {
      setTitle(hm, for: [])
      lbl.text = String(cidex)
    }
  }
  func ciSelectedAct() {
    isSelected ? lookSel() : lookUn()
  }
  func lookSel() {
    //    alpha = 0.95125
  }
  func lookUn() {
    //    alpha = 0.75125
  }
  func ciNeg0iAct(_ ref: Pivot) {
    cp00 = cpShiftedRelativeTo(
      referenceView: ref,
      byDegrees: ang00_o)
    center = cp00
    lbl.center = center
    transform = .identity
    lbl.transform = .identity
    
    //    cibgc = .red; bgc(cibgc!) // 4dbug
    
  }
  func ciNeg4vAct(_ ref: Pivot) {
    cp4v = cpShiftedRelativeTo(
      referenceView: ref,
      byDegrees: ang4v_o)
    center = cp4v
    lbl.center = center
    transform = .init(rotationAngle: ang4v_o.cgRadians())
    lbl.transform = .init(rotationAngle: ang4v_o.cgRadians())
  }
  func ciPos4vAct(_ ref: Pivot) {
    cp4v = cpShiftedRelativeTo(
      referenceView: ref,
      byDegrees: ang4v_o)
    center = cp4v
    lbl.center = center
    transform = .init(rotationAngle: ang4v_o.cgRadians())
    lbl.transform = .init(rotationAngle: ang4v_o.cgRadians())
    self.cornerRadiusRatio(nil)
    self.lbl.cornerRadiusRatio(nil)
  }
  func ciPos0iAct(_ ref: Pivot) {
    cp00 = cpShiftedRelativeTo(
      referenceView: ref,
      byDegrees: ang00_o)
    center = cp00
    lbl.center = center
    transform = .identity
    lbl.transform = .identity
    
    //    lbl.textColor = .darkGray
    setTitleColor(.blue, for: [])
    self.cornerRadiusRatio(nil)
    self.lbl.cornerRadiusRatio(nil)
    
  }
}
extension ChildVC {
  func seekCieLL(_ llz: String, in cyce:[Cie]) -> Cie? {
    var cye: Cie?
    var found = 0
    let ll = llz.dropLast()
    
    for c in cyce {
      //      print("assert scll", c.cidex, i)//FIXME: tmpCO
      let cill =
        c.hm.dropLast()
      if cill != ll { continue }
      cye = c
      found += 1
    }
    assert(found <= 1)
    return cye
  }
  func seekCie(llz: String, in cyce:[Cie],
               f:String=#function) -> Cie {
    var cye: Cie?
    var found = 0
    for (i,c) in cyce.enumerated() { // checking pos or neg
      if cyce.count == dice.count { assert(c.cidex == i) }
      //      print(f, "c.hm", c.hm, llz, i)
      if c.hm != llz { continue }
      cye = c
      found += 1
    }
    assert(found == 1)
    return cye!
  }
}
extension Cie {
  func assignCie(target: UIViewController) {
    self.addTarget(
      target,
      action: #selector(
        (target as! ChildVC).ciClick(sndr: )),
      for: .touchUpInside)
  }}
extension ChildVC {
  @objc func ciClick(sndr: Cie) {
    if okClick(cie: sndr) == false { return }
    sndr.toggleButton(sndr)
    sndr.ciLo(.ciSel, vw: psGrid)
    
    gui(sndr.hm)
    
    if sndr.isSelected {
      gm.trgt = sndr
    } else { gm.trgt = nil }
    initMoveCi(trgt: gm.trgt, gm, psCice, dice)
  }
  func okClick(cie: Cie) -> Bool {
    
    if gm.tap2close { return false }
    
    if cie.isSelected { return true }
    let other =
      seekSel(cyce: nsCice)
        + seekSel(cyce: psCice)
    if other.isEmpty { return true }
    assert(other.count == 1)
    if !gm.okToSwapCice { return false }
    
    let one = other.first
    assert(one == gm.trgt)
    one!.isSelected = false
    one!.ciLo(.ciSel, vw: psGrid)
    return true
  }
  func seekSel(cyce:[Cie]) -> [Cie] {
    var cieArr:[Cie] = []
    for (i,c) in cyce.enumerated() {
      //      print("assert sks", c.cidex, i)
      c.ciLo(.ciSel, vw: psGrid)
      if !c.isSelected { continue }
      let s =
        seekCie(llz: c.hm, in: cyce)
      assert(s.cidex == i)
      cieArr.append(c)
    }
    return cieArr
  }}
//func dishArrayOf(cyce: [Cie], f:String=#function) {
//  for c in cyce {
//    print(f, "cillz ax", c.hm, c.ciax)
//  }
//}

