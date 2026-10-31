//
//  D3VIC3_hlp.swift
//  two3
//
//  Created by G on 11/29/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import SwiftUI
public enum D3VIC3 {
  case iPad
  case iPhone
  case macOSX
  case wtchOS
  case unknown
}
fileprivate func getCurDevice() -> D3VIC3 {
  #if targetEnvironment(macCatalyst)
  print("osxdvc")
  return .macOSX
  
  #elseif os(watchOS)
  print("wtchdvc")
  return .wtchOS
  
  #elseif iPad
  print("ipddvc")
  return .iPad
  
  #else
  print("iphdvc")
  return .iPhone
  
  #endif
}
extension ViewController {
  func prepTransition(size: CGSize) {
    if (skpRESIZE == 1) { return Void() }

//    wasFrame = view.frame
    
//    for cd in childArr {
//      cd.prepTransition(size)
//    }
    g0vPortraight = ckP0RTrait()

    refreshOuterViews()

  }}
@propertyWrapper
public struct UsesAutoLayout<T: UIView> {
    public var wrappedValue: T {
        didSet {
            wrappedValue.translatesAutoresizingMaskIntoConstraints = false
        }
    }
    public init(wrappedValue: T) {
        self.wrappedValue = wrappedValue
        wrappedValue.translatesAutoresizingMaskIntoConstraints = false
    }
}
extension ViewController {
  @objc func orientationChanged() {
    let dco = UIDevice.current.orientation.rawValue
    print(#function, dco)
    g0scoreSlat!.tag = 0 - 1503
    checkOrientation(0.100)
  }
  
  func checkOrientation(_ dly: Double?) {
    if (skpORIENT == 1) { return Void() }
    
    let wasz = view.frame.size // b4delay
    let wait: Double = dly ?? waitTime
    let when = DispatchTime.now() + wait
    DispatchQueue.main.asyncAfter(deadline: when) {
      let i = #function
      let dl = self.view.frame.size // delayed
     
      let isPortraight = self.ckP0RTrait()
      g0isPortraight = isPortraight
      let aspectRatio = self.view.vwAspectRatio()
      
      let exp = 1/pow(aspectRatio, 1/2)// cubeRoot
      var dup: CGFloat = isPortraight ? exp : 1.0 // moveUp if portraight
      dup = 1.0
      self.vcStableView.center.x = self.view.center.x
      self.vcStableView.center.y = self.view.center.y/dup
      
      let mult: CGFloat = isPortraight ? 2.2 : 1.0
      let downShift = self.topView.frame.height * mult
      self.vcStableView.frame.origin.y = downShift
//      self.vcStableView.backgroundColor = .cyan
      
      for kid in self.childArr {
        if isPortraight && g0isPad {
//          kid.psGrid.alpha = 0.4116
//          kid.psGrid.backgroundColor = .purple
          self.vcStableView.addSubview(kid.psGrid)
          kid.psGrid.center.x = self.vcStableView.center.x
        }}
      print(i, wasz, dl, aspectRatio)
      self.refreshOuterViews()
    }
  }}
//var g0isPortraight: Bool? // = true
//let g0isPad = UIDevice.current.userInterfaceIdiom == .pad
//let g0isPhone = UIDevice.current.userInterfaceIdiom == .phone
extension ViewController {
  internal
  func refreshOuterViews() {

    topBurger.center = .zero
    topBurger.center.x -= topBurger.frame.width / (.pi * 2) // adjust moonSize

    let centerPoints =
      position(flipper: self.toggle)
    self.toggle.center        = centerPoints[0]
    toggle.echo.center        = centerPoints[1]
    toggle.echo.button.center = toggle.echo.center

    
    let notText = self.toggle.titleLabel!.text
    let notGrid = self.seekGridPos(
      nm: notText!, in: self.childArr)
    notGrid.replica!.center = self.toggle.center
    
    notGrid.replica?.isHidden = false
    loadMenus(size: notGrid.replica!.frame.size)
    
    let trueText = self.toggle.truTitle
    let trueChild = self.seekChildVC(nm: trueText, in: childArr)
    trueChild.psGrid.isUserInteractionEnabled = true
    let notChild = self.seekChildVC(nm: notText!, in: childArr)

    if UIDevice.current.userInterfaceIdiom == .phone {
      vcStableView.frame = view.vwMaxSqar(sd: 1.0)
      // dice outside the stableView are unresponsive
      vcStableView.frame.size.height *= 1.35 // compensate
//      vcStableView.strechCustomWood(.pngtr_541099psd)
      // D3V-GS-191229a only bottomHalf of the screen bugFixed
      vcStableView.center = view.center
    } else {
//      vcStableView.frame.size.height *= 1.75
    }
    
    trueChild.show(stats: ShowStat.allCases)
    trueChild.psGrid.shiftSubviewsRightFor(game: trueChild.gm)
    
    
    notGrid.shiftSubviewsRightFor(game: notChild.gm)
    super.view.strechCustomWood(.wgpsd_541099, cornered: 0.0)
    
    self.toggle.echo.button.addTarget(
      self, action: #selector(didTapEcho(sndr: )), for: .touchUpInside )
  }
  @objc func didTapEcho(sndr: UIButton) {
    
    let name = toggle.isFlipped ? toggle.notTitle : toggle.truTitle
    
    let namedChild = self.seekChildVC(nm: name, in: childArr)
    assert( namedChild.didTapChildEcho() )
    namedChild.show(stats: ShowStat.allCases)
  }
}
extension ChildVC {
  func didTapChildEcho(u:String = #function) -> Bool {
    let u2 = #function; print(u2, u, gm.gameName)
    
//    psGrid.isUserInteractionEnabled = false
    
    for d in dice {
      let wasPlucked = d.isPlucked
      let wasSelected = d.isSelected
      d.isPlucked = true
      d.isSelected = true
      
      if diSimTap(sndr: d) {
       resetDice()
       gm.gameTime = pauseTimer()
       return gm.resetALL()
      }
      
      d.isPlucked = wasPlucked
      d.isSelected = wasSelected
    }
    return false
  }
  func resetDice() {
    for d in dice {
      d.slids = 0
    }
  }
}
