//
//  addCVC(arr.swift
//  two3
//
//  Created by G on 11/29/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import SwiftUI
extension ViewController {
  internal
  func addChildVCarr(make4: Bool) -> [ChildVC] {
    
    g0vFSM = make4 ? g0sFSM_make4 : g0sFSM // enlarge
    let gmXtru  = ggX // globalGame_X_
    let cvcq    = CVCQ( superView: view, game: ggXnot)
    let cvcx    = CVCX( superView: view, game: gmXtru)
    
    let maxRect = vcMaxSqar(sd: gsd)
    let maxSquareSize = maxRect.size
    //    vcStableView = UIView(frame: maxSquare)
    
    vcStableView = CenterView(pvnm: "stab1o")// oneOnly
    vcStableView.frame = maxRect
    
    let arr = [cvcq, cvcx]
    for kid in arr {
      addChild(kid)
      view.addSubview(kid.view)
      kid.didMove(toParent: self)
      kid.view.frame.size = maxSquareSize
      kid.psGrid.frame.size = maxSquareSize
      kid.nsGrid.frame.size = maxSquareSize
      
      kid.prepGridViews(mk4: make4)
      
    }
    vcGridArr = [arr[0].psGrid,
                 arr[0].nsGrid,
                 arr[1].nsGrid,
                 arr[1].psGrid
    ]
    if make4 {
      add4cornerGrids(vcGridArr)
    } else { addFullGrids(vcGridArr) }
    
    return arr // addChildVCarr()
  }
  
  func addFullGrids(_ arr: [Grid]) {
    for g in arr {
      g.frame.origin = .zero
      g.isHidden = !ovrHIDE
      if g is NegativeGrid {
        g.center.y *= -2.222 // off_screen
        continue }
      vcStableView.addSubview(g)
    }
    //    arr[0].isHidden = false
  }
  
  func add4cornerGrids(_ arr: [Grid]) {
    vcStableView.add4corner(views: vcGridArr)
    arr[0].bgc(hidC0LR2)
    arr[1].bgc(hidC0LR3)
    arr[2].bgc(hidC0LR2)
    arr[3].bgc(hidC0LR3)
    arr[0].isHidden = ovrHIDE
    arr[1].isHidden = ovrHIDE
    arr[2].isHidden = ovrHIDE
    arr[3].isHidden = ovrHIDE
  }
}

var g0vPortraight = true
//var g0vDevice = D3VIC3.unknown
extension VC {
  func ckP0RTrait(i:String=#function) -> Bool {
    let vw = self.view.frame.width
    let vh = self.view.frame.height
    p0rt = vh/vw > 1
    
    let ii = i + #function
    print(ii, vw, vh, (vh/vw).cgRound(2), p0rt!)
    
    return p0rt!
  }}
extension UIView {
  func vwAspectRatio() -> CGFloat {
    
    return frame.width /  frame.height
  }
}
extension CGFloat {
  func cgRound(_ nDecimalPlaces: CGFloat) -> CGFloat {
    let multiplier = pow(10, nDecimalPlaces)
    return (multiplier * self).rounded()/multiplier
  }}
extension Double {
  func dbRound(_ nDecimalPlaces: Double) -> Double {
    let multiplier = pow(10, nDecimalPlaces)
    return (multiplier * self).rounded()/multiplier
  }}
