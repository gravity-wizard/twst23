//
//  Flipper_qx.swift
//  two3
//
//  Created by G on 11/30/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import SwiftUI

class Echo: UILabel {
  
  var button = UIButton()
  
}
class Flipper: UIButton {
  
  var echo: Echo = Echo() // labelBelow
  
  var isFlipped = false
  
  let truTitle = ggX.gmtitle //"TRU"
  let notTitle = ggXnot.gmtitle // "N0T"
  var viewTru: UIView?
  var viewNot: UIView?
  
  var colorNot: UIColor = .systemRed
  var colorTru: UIColor = .systemGreen
  
  
  /// array of gameTitles
  init(_ arr:[String] ) {
    // true false texts
    super.init(frame: .zero)
    //    truTitle = arr[1]
    //    notTitle = arr[0]
    setTitle( notTitle, for: [])
    sizeToFit() //FIXME:
    
    echo = Echo()
    //    echo!.text = notTitle + g0sGappedCircle
    
    if z1i == zrv(.norm) {
      colorNot = .red
    }
    
  }
  required init?(coder: NSCoder) {
    fatalError("coder: wrd flp")
  }
  func togFlip() -> String {
    isFlipped = !isFlipped
    setTitle(isFlipped ? truTitle : notTitle, for: [])
    //    backgroundColor = isFlipped ? colorTru : colorNot
    
    //titleLabel?.font = titleLabel?.font.withSize(112)
    let nowTitle = titleLabel!.text
    
    sizeToFit()
    return nowTitle!
  }
}

extension ViewController {
  func simToggle(flipper: Flipper) {
    _ = u5did(toggle: flipper)
  }
  @objc func u5did(
    toggle: Flipper) -> String? {
    if disableFLIP { 1.ui(xt); return nil }
    
    let txtB4change =
      toggle.titleLabel!.text!
    let newText = toggle.togFlip() // readback
    //
    let truGrid =
      seekGridPos(nm: txtB4change, in: childArr)
    // game now becomes the game that was on the button
    let notGrid =
      seekGridPos(nm: newText, in: childArr)
    
    notGrid.isHidden = !ovrHIDE
    truGrid.isHidden = false
    vcStableView.addSubview(truGrid)
    
    truGrid.frame.origin = .zero
    truGrid.replica?.removeFromSuperview()
    notGrid.replica?.removeFromSuperview()
    
    notGrid.replica = // create and add
      toggle.fitImage__A(grid: notGrid)
    
    
    
    self.view.addSubview(notGrid.replica!)
    
    toggle.setTitle(newText, for: [])
    
    let notVC = self.notVC()
    let truVC =
      seekChildVC(nm: txtB4change, in: childArr)
    
    notVC.gm.gameTime = notVC.pauseTimer()
    let truTime = truVC.resumeTimer()
    
    let timeNowLabel =
      seekTimeStat(stub: .nowTime, inArr: g0scoreSlat?.statArr ?? [] )
    timeNowLabel?.text = (timeNowLabel?.stub ?? g0sTimeText) + String(truTime)
    
    checkOrientation(0.100)
    
    return newText
  }
  func notVC() -> ChildVC {
    let flipText = toggle.titleLabel!.text!
    let notVC =
      seekChildVC(nm: flipText, in: childArr)
    return notVC
  }
}

extension ViewController {
  func toggAsNewFlipper() {
    //    assert(toggle == nil)
    let gameTru = childArr[1].gm
    let gameNot = childArr[0].gm
    print("gmTru/not", gameTru.gameName, gameNot.gameName)
    
    self.toggle =
      newFlipperForGameX(
        gameTru, and: gameNot)
    
    toggle.addTarget(
      self,
      action: #selector(
        u5did(toggle: )),
      for: .touchUpInside)
    //    self.view.addSubview(self.togg!)
  }
  fileprivate func newFlipperForGameX(
    _ gmx: Game_QX_,
    and not:Game_QX_) -> Flipper {
    
    let titleTru = gmx.gmtitle
    let titleNot = not.gmtitle
    
    let flip =
      Flipper([titleTru, titleNot])
    return flip
  }
}
extension ViewController {
  func seekChildVC(
    nm: String,
    in childs: [ChildVC]) -> ChildVC {
    var res: ChildVC?
    var found = 0
    for cvc in childs {
      if !(cvc.psGrid.pvnm as AnyObject).contains(nm) { continue }
      found += 1
      res = cvc
    }
    print("cvc", res!)
    assert(found == 1)
    return res!
  }
  
  func seekGridPos(
    nm: String,
    in childs: [ChildVC]) -> PositiveGrid {
    
    let adjustedName = nm.replacingOccurrences(of: g0sGappedCircle, with: "")
    
    
    var res: PositiveGrid?
    var found = 0
    for cvc in childs {
      if !(cvc.psGrid.pvnm as AnyObject).contains(adjustedName) { continue }
      found += 1
      res = cvc.psGrid
    }
    print("cvc.nm", res!.pvnm)
    assert(found == 1)
    return res!
  }
}
let g0sGappedCircle = "⟲"

extension Flipper {
  func fitImage__A(grid: PositiveGrid) -> Replica {
    assert(grid.subviews.count > 0)
    for sv in subviews {
      sv.removeFromSuperview()
    }
    // flipScale make larger on iPhone via nar
    let ratio: CGFloat = 1.0/(8.int__narCGF(0.5))
    let recip = 1/ratio // 10.199 on iPad
    let grdWidth = grid.frame.size.width
    let grdHeight = grid.frame.size.height
    self.frame.size.width = grdWidth / recip
    self.frame.size.height = grdHeight/recip
    
    let replica = grid.replicate(scale: ratio)
    replica.isUserInteractionEnabled = false
    
    replica.isHidden = true
    //    rep.bgc( .red)
    //    rep.alpha = 0.55
    return replica
  }
}
extension ViewController {
  func position(flipper: Flipper) -> [CGPoint] {
    
    let echo = flipper.echo
//    echo.button.backgroundColor = .orange
    echo.textColor = CCBLU.beige.__uiColor()
    echo.font = UIFont.monospacedDigitSystemFont(
      ofSize: 1.50 * FontSize.digits,
      weight: UIFont.Weight.bold)
    
    let str = "Shuffle " + g0sGappedCircle
    let att = NSMutableAttributedString(string: str)
    
    att.addAttribute(NSAttributedString.Key.font,
                     value:UIFont.monospacedDigitSystemFont(
                      ofSize: 0.50 * FontSize.digits, weight: .regular),
                     range:NSMakeRange(0, 8))
    
    echo.attributedText = att
    
    echo.sizeToFit()
    echo.button.frame = echo.frame
    echo.button.frame.size.height *= 0.55
    
    let ew = echo.frame.width
    let eh = echo.frame.height
    let ecx = view.frame.width  - ew/pow(2, 00.50)
    let ecy = view.frame.height - eh/pow(2, 00.50)
    let eCP = CGPoint(x: ecx, y: ecy) // echoCenterPoint
    
    
    //    let fw = flipper.frame.width
    let fh = flipper.frame.height
    let fcx = ecx
    let fcy = ecy - fh/pow(2, 0.0)
    let fCP = CGPoint(x: fcx, y: fcy) // flipperCenterPoint
    
    return [fCP, eCP]
  }
  
}
