////
////  SlatViewBT.swift
////  QXicz
////
////  Created by G on 9/22/19.
////  Copyright © 2019 sdxAGS. All rights reserved.
////
//
import UIKit

let MSW = UIScreen.main.bounds.width
let MSH = UIScreen.main.bounds.height
// mainScreenCenterPoint
let MSCP = CGPoint(x: MSW / 2.0 , y: MSH / 2.0)

let g0sTopRect = CGRect(
  x: 0, y: 0,
  width: MSW * 1.0 , height: MSH * 0.05)
//let g0sTopView: UIView = UIView(frame: g0sRect) // move to VC

let g0sTopY:  CGFloat = 0.0 // 85.0
let g0sLeftX: CGFloat = 0.0 // 10.0
var g0vLeftX  = g0sLeftX
var g0vTopY   = g0sTopY

let g0sDownDefault    = CGVector(dx: 08.0, dy: 01.0)
let g0sAcrossDefault  = CGVector(dx: 01.0, dy: 10.0)


class TopBurger: Burger {}
class Burger: UIButton {
  var slatArr: [SlatView] = []
  // 1/8 width and 1/4 height for down
  
    var downVector    = g0sDownDefault
    var acrossVector  = g0sAcrossDefault
    // n0t-fractions full width & 1/10 height default
    // D3V-GS-191229b across when portraight
    
  //  convenience
    init(fractions: [CGVector]?) {
  //    self.init() smallValues are fractions dy = 3.0 then slat is 1/3 screenHeight
      self.downVector = fractions?.first ??  g0sDownDefault// default if nil
      self.acrossVector = fractions?.last ?? g0sAcrossDefault// default if nil
      super.init(frame: .zero)
    }
  
  //      let frac: CGVector = topBurger.fractions!
  // slatExtend1btByFractions(x: frac.dx, y: frac.dy) toUse
  required init?(coder: NSCoder) {
    fatalError("wrd burger")
  }
}
class Stat: UILabel {
  
  var stub: String?
  
  init(stub: String) {
    self.stub = stub
    super.init(frame: .zero)
  }
  required init?(coder: NSCoder) {
    fatalError("wrd stat")
  }
}

extension ViewController {
  func populateMenusTop() -> Int {
    
    let popArr = MenuTitlesTop.allValues
    
    popButtonsBT =
      g0scoreSlat!.buttonsAdd(names: popArr, andIndexed: .menu)
    g0scoreSlat!.buttonsArrangeChecking(base: .menu)
    
    for b in popButtonsBT {
      b.addTarget(self, action: #selector( /// =================>
        popButtonClicked(sndr: )), for: .touchUpInside)
    }
    return popButtonsBT.count
  }
}
extension ViewController {
  @objc func xButtonClicked(sndr: UIButton) {
    let s = sndr.superview!
    print(#function, s.tag, s.classForCoder)
    
    if sndr.superview == g0scoreSlat {
      vcSlatRetractTop(unlock: true)
    }
    if sndr.superview == mainMenuSlat {
      retractMainMenu(unlock: true)
    }
    if sndr.superview == settingMenuSlat {
      vcSlatRetractSettings()
    }
    if sndr.superview == tutorialViewSlat {
      vcSlatRetractTutorial()
    }
  }
}
