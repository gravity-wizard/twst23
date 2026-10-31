//
//  EdgeButton.swift
//  two4
//
//  Created by G on 10/14/19.
//  Copyright © 2019 akapps. All rights reserved.
//


// https://unicode-table.com/en/#oriya
// https://en.wikipedia.org/wiki/Geometric_Shapes
// https://flawlessapp.io/blog/dive-deep-into-swift-string/
var scalars = "🌊".unicodeScalars // 127754, or 0x1F30A

import UIKit
//let edge00tag = 2500
enum EdgeName: String, CaseIterable {
  static let scalarQ = "▢".unicodeScalars
  // the first element is the prefix
  // the last number is default index + 1
  // currently only use single characters
  case twistDice      = "td ,1,0,1"
  case twistNegative  = "tn ,1,0,2"
  case twistPositive  = "tp ,1,0,1"
  case mode24         = "mx ,1,0,2" // set1 4xGame
  case numwide        = "wi ,1,2,3,4,5,6,3"
  case numhigh        = "hi ,1,2,3,4,5,6,2"
  case negSpace       = "ns ,1,0,1" // iaw endIndex and u5
  
  //    case zer0thru9      = "z~,0,1,2,3,4,5,6,7,8,9,5"
  case homePosOrNeg   = "hm ,p,n,X,2"
  static let allEdgeValues
    = EdgeName.allCases.map { $0.rawValue }
}
class EdgeButton: UIButton {
  var nowDex = 0-1
  var wasDex = 0-1
  var endDex = 0-1
  var edgeName: EdgeName?
  convenience init(name: EdgeName) {
    self.init()
    edgeName = name
    let rv = edgeName?.rawValue
    nowDex = setTitleFromComponents(edgeName!)
    let comps = rv!.components(separatedBy: ",")
    let endComp = comps.last
    endDex = endComp!.toInt()
    edgeButtonStyle(rv!)
  }
  override init(frame: CGRect) {
    super.init(frame: frame)
  }
  required init?(coder: NSCoder) {
    fatalError("egtn wrdimp")
  }
  func edgeButtonStyle(_ text: String) {
    setTitleColor(.yellow, for: [] )
    titleLabel?.font =
      UIFont.systemFont(ofSize: fnt.szEB)
    sizeToFit()
  }
}
extension String {
  func prefixFromComponents(en : EdgeName) -> String {
    let rv = en.rawValue
    let comps = rv.components(separatedBy: ",")
    let prefix = comps.first
    return prefix!
  }
  func prefixAnd1charFromComponents(en: EdgeName) -> String {
    let Δ = 0 // prefixChange
    let rv = en.rawValue
    let endInt = rv.u5readCurrentInt()
    
    let comps = rv.components(separatedBy: ",")
    let prefix = comps.first
    let char: Character = Character(comps[ endInt - Δ ])
    print(#function, rv, endInt, char)
    
    let res = prefix! + String(char)
    return res
  }
}
extension VC {
  func seekEdgeButtonWith(txt: String) -> EdgeButton {
    let seekBaseTag = G0base.edgeButton.rawValue
    var res: EdgeButton?
    var i = 0
    var foundCount = 0
    var foundIndex = 0-1
    //FIXME: requires unique titles
    for eb in edgeButtonsArr {
      i += 1
      let title = eb.titleLabel?.text!
      if title!.contains(txt) == false { continue }
      if eb.tag != seekBaseTag + i { continue }
      res = eb
      foundIndex = i
      foundCount += 1
    }
    let sbTag = (res!).tag // shouldBeTag
    print(#function, sbTag, foundIndex)
    assert(sbTag == seekBaseTag + foundIndex)
    assert(foundCount == 1)
    return res!
  }
}
extension EdgeButton {
  func setTitleFromComponents(_ en: EdgeName) -> Int {
    //         func oneCharFromComponents(en: EdgeName) -> Character {
    let Δ = 0 // prefixChange
    let rv = en.rawValue
    let endInt = rv.u5readCurrentInt()
    let comps = rv.components(separatedBy: ",")
    let prefix = comps.first
    let char: Character = Character(comps[ endInt - Δ ])
    print(#function, rv, endInt, char)
    setTitle(prefix! + String(char), for: [] )
    //        sizeToFit()
    return endInt
  }
}
extension ViewController {
  func bsAddEdgeButtons() -> [EdgeButton] {
    //    assert(EdgeName.count > 0)
    var arr: [EdgeButton] = []
    for name in EdgeName.allCases {
      let ebtn = EdgeButton(name: name) /// eb
      //      ebtn.assignEB(target: self) // buggy??
      ebtn.addTarget(
        self,
        action: #selector(
          bsEdgeClick(sndr: )),
        for: .touchUpInside)
      
      arr.append(ebtn) /// ++++ eb
      assert(arr.count > 0)
    }
    view.ySeperateViews(arr)
    if zck(.xtra) {
      self.view.addSubviews(arr)
    }
    
    return arr
  }
}
extension UIView {
  func addSubviews(_ arr: [UIView]) {
    for sv in arr {
      addSubview(sv)
    }}
  func ySeperateViews(_ arr: [UIView]) {
    var cgi: CGFloat = 0
    let gnt = CGFloat(arr.count) + 1
    let ygap = frame.size.height/gnt
    
    for sv in arr {
      sv.tag = Int(cgi) + G0base.ySeperate.rawValue
      assert(sv.setTagCG(i: cgi))
      cgi += 1
      sv.center.y = ygap * cgi
    }}}
extension ViewController {
  internal func opUserDefaults(_ op: U5operation) {
    assert(edgeButtonsArr.count > 1)
    switch op {
    case .read:   readUserDefaults()
    case .reset:  resetUserDefaults()
    }
  }
  fileprivate func readUserDefaults() {
    for eb in edgeButtonsArr {
      // was set by user
      eb.wasDex = (eb.edgeName?.rawValue.u5readCurrentInt())!
      eb.nowDex = eb.wasDex
    }}
  fileprivate func resetUserDefaults() {
    for eb in edgeButtonsArr {
      // was set by user
      eb.wasDex = (eb.edgeName?.rawValue.u5resetCurrentInt())!
      eb.nowDex = eb.wasDex
    }}
  func actIAWuserDefaults() {
    for eb in edgeButtonsArr { // don't increment
      reactViaEnum(en: eb.edgeName!, 0)
    }
  }}

let fn = #function // two4 weirdness



//extension EdgeButton {
//  func assignEB(target: UIViewController) {
//
//    self.addTarget(
//      target,
//      action: #selector(
//        (target as! ViewController).bsEdgeClick(sndr: )),
//      for: .touchUpInside)
//
//    print("edgeName, target", edgeName!, target)
//
//
//  }}




extension ViewController {
  @objc func bsEdgeClick(sndr: EdgeButton) {
    let spr = sndr.superview
    print(#function, "spr.tag", spr!.tag)
    
    sndr.toggleBGclearOr(color: .brown)
    print("sndtt", sndr.titleLabel!.text!, sndr.tag)
    
    reactEdgeClick(sndr: sndr)
    //    configurationDidChange()
  }}
extension EdgeButton {
  func seekEnumEdgeName(_ edgeNames: [EdgeName]) -> EdgeName {
    let seekBaseTag = G0base.edgeButton.rawValue
    var i = 0
    var foundCount = 0
    var foundIndex = 0-1
    // preventDuplicates
    let last1char: String = String(titleLabel!.text!.last!)
    
    let char: Character =
      Character(last1char)
    var res: EdgeName?
    for en in edgeNames {
      i += 1
      let rv = en.rawValue
      if rv.contains(char) == false { continue }
      if tag != seekBaseTag + i { continue }
      res = en
      foundIndex = i
      foundCount += 1
    }
    print(#function, tag, foundIndex)
    assert(tag == seekBaseTag + foundIndex)
    assert(foundCount == 1)
    return res!
  }}
extension ViewController {
  func reactEdgeClick(sndr: EdgeButton) {
    let edgeName =
      sndr.seekEnumEdgeName(
        EdgeName.allCases)
    print(#function, edgeName)
    
    reactViaEnum(en: edgeName, 1)
  }
  func reactViaEnum(en: EdgeName, _ inc: Int) {
    let rv = en.rawValue
    let comps = rv.components(separatedBy: ",")
    let wasInt = rv.u5readCurrentInt()
    let wasChar = comps[wasInt]
    
    let nowInt = rv.u5writeNextAdding(inc)
    let prefix = rv.prefixFromComponents(en: en)
    let wasStr = prefix // + wasChar
    let zeb = seekEdgeButtonWith(txt: wasStr)
    print(#function, zeb.titleLabel!.text!)
    
    assert(zeb.wasDex == wasInt)
    zeb.nowDex = nowInt
    zeb.wasDex = zeb.nowDex
    
    let newStr = rv.prefixAnd1charFromComponents(en: en)
    let b4a = [wasChar, String(newStr)] // beforeAfter
    zeb.setTitle(newStr, for: [] )
    zeb.sizeToFit()
    
    print(b4a)
    
    switch en {
    case .mode24:       mode24Act(b4a, eb:zeb)
    case .negSpace:     negSpaceAct(b4a, eb:zeb)
      
    case .twistDice:    twistDiceAct(b4a, eb:zeb)
    case .twistNegative:twistNegativeAct(b4a, eb:zeb)
    case .twistPositive:twistPositiveAct(b4a, eb:zeb)
      
    case .numwide:      numwideAct(b4a, eb:zeb)
    case .numhigh:      numhighAct(b4a, eb:zeb)
    case .homePosOrNeg: homePosOrNegAct(b4a, eb:zeb)
    }
    for cd in childArr {
      cd.configurationDidChange()
    }
  }
  func homePosOrNegAct(_ b4a: [String], eb: EdgeButton) {
    print(#function, eb.tag, b4a)
    ebHomeString = b4a.last?.endAsString()
    
    var whare: M0DHomeWhere = .dontHome
    for en in M0DHomeWhere.allCases {
      let rv = en.rawValue
      
      if ebHomeString == rv { whare = en }
      
    }
    ebHomeWhereM0D = whare
    
  }
}
extension String {
  func endAsString() -> String {
    return String(self.last!)
  }
  func endAsInt() -> Int {
    return String(self.last!).toInt()
  }
  func endAsBool() -> Bool {
    let endAsInt = self.endAsInt()
    return (endAsInt as NSNumber).boolValue
  }}
extension ViewController {
  func negSpaceAct(
    _ b4a: [String],
    eb: EdgeButton) {
    print(#function, eb.tag, b4a)
    ebPosGmBool = b4a.last?.endAsBool()
    ebPosOnlyM0D = ebPosGmBool! ? .gmBoth1 : .gmP0nly
    
    //    sqArr = refreshSquares()
    for cd in childArr {
      cd.gm.savedLLzArr = cd.gm.saveLLzArr(dyce: cd.dice)
    }
  }
  func twistDiceAct(_ b4a: [String], eb: EdgeButton) {
    print(#function, eb.tag, b4a)
    
    for cd in childArr {
      cd.gm.twistDice = (b4a.last?.endAsBool())!
    }
    
    
  }
  func twistNegativeAct(_ b4a: [String], eb: EdgeButton) {
    print(#function, eb.tag, b4a)
    ebRottNegBool = (b4a.last?.endAsBool())!
  }
  func twistPositiveAct(_ b4a: [String], eb: EdgeButton) {
    print(#function, eb.tag, b4a)
    
    for cd in childArr {
      cd.gm.twistCice = (b4a.last?.endAsBool())!
    }
  }
  func mode24Act(_ b4a: [String], eb: EdgeButton) {
    print(#function, eb.tag, b4a)
    
    isMode24 = b4a.last?.endAsBool()
    
  }
  func numwideAct(_ b4a: [String], eb: EdgeButton) {
    print(#function, eb.tag, b4a)
    
//    let e = b4a.last
    //    gm.ecHorizon = e!.endAsInt()
    //        game.mask = nil
  }
  func numhighAct(_ b4a: [String], eb: EdgeButton) {
    print(#function, eb.tag, b4a)
    //        assert(game.ecVertical == b4a.first?.toInt())
//    let e = b4a.last
    //    gm.ecVertical = e!.endAsInt()
    //        game.mask = nil
  }}

extension ChildVC {
func configurationDidChange(u:String=#function) {
  gui(#function + u + x0t)
  for sv in view.subviews {
    if abs(sv.tag) > G0tag.keep.rawValue { continue }
    sv.tag = 0
    sv.removeFromSuperview()
  }

  configureVDL(ebPosOnlyM0D, game: gm)
  
  restartConfiguredGames()
  

  if (skpREAD == 1) { return Void() }
  readRegionsIn(psCice)
  updateArrowsFor(dice)

  
  gm.writeSolutionFrom(cyce: psCice)
  
  //    etvs[0].text = gm?.solution
  
  // no mixing
  if (skpMIX == 1) { return Void() }
  if gm.mixFig == 0 { gm.slids = gm.slidsMax }
  
  
  slideNextDieIn(psCice, dice)
  //    slideNextDieIn(gm_rp, psCice_rp, dice_rp)
  
}}
extension ChildVC {
  func plugEmptyCieIn(
    _ cyce: [Cie],
    _ dyce: [Die]) {
    
     let game = gm
    
    if game.slids < 0 {
      print("slids<0"); return
    }
    if game.fixed == .done {
      gui("fixed"); return
    }
    
    if slideDir8toCloseIn(cyce, dyce) == nil {
      slideNextDieIn(cyce, dyce)
    }
  }
}

