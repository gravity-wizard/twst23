//
//  ChildVC.swift
//  two3
//
//  Created by G on 11/29/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import UIKit

//class Pivot: UILabel {
class Pivot: UIView {

  let pvtxt: String?
  // var 4dbug
    var pvbgc: UIColor?
//  let pvbgc: UIColor?
  let pvbgc1n = UIColor.clear
  
  let pvtxtclr: UIColor?
  let pvtxtclr1n = hidC0LR
  //let hm:String=""
  //trk let4ck unique
  var  pvnm: String = ""
  init(pvnm: String) {
    self.pvnm = pvnm
    pvtxt     = pvnm
    pvbgc     = pvbgc1n // 1nit
    pvtxtclr  = pvtxtclr1n
    super.init(frame:.zero)
    backgroundColor = pvbgc
//    textColor = pvtxtclr
//    self.text = pvtxt
    
//    print("pvnm", text!)
    
//    textAlignment = .right
//    autoresizesSubviews = true
  }
  required init?(coder: NSCoder) {
    fatalError("pvt wrdimp")
  }
}

class Replica: UILabel {}

class PositiveGrid: Grid {
  
var moveView: MoveStatView?
var timeView: TimeStatView?
  
}
class NegativeGrid: Grid { }

//fileprivate
class Grid: CenterView {
  var ara = Aura()
  var gameName: String?
  var vector = CGVector()
  
  var replica: Replica?
  
//  var moveView: MoveStatView?
//  var timeView: TimeStatView?

//  override autoresizesSubviews = true
}

class ChildVC: VC {
  // n0t-gm means game
  var gm = Game_QX_()
  var childLabel = UILabel()
  var childButton = UIButton()
  
//  var viewSize = CGSize()
//  var viewFrame = CGRect()
//  var viewVector = CGVector()
//  var wasFrame = CGRect()
  
  var psGrid = PositiveGrid(pvnm: "psg") // positive
  var nsGrid = NegativeGrid(pvnm: "nsg") // negativeSpace
  
  var psCice: [Cie] = []
  var nsCice: [Cie] = []
  var dice:   [Die] = [] // only one set per game
  
  var moverLabel_taa = MoverLabel()
  var timerLabel_taa = TimerLabel()
  
  var moverLabel_skk  = U5Label()
  var timerLabel_skk  = U5Label()
//  var timerElem0ld = U5Element()
  
//  var statsLabel = U5Label()
  
  var timerObject:  Timer?
  var timerButton = TimerButton()
  var timerDuration: Double = 0.00
  // current reading or start time
  var timerValue = g0sGameTime

  convenience init(
    superView: UIView, // superview
    game: Game_QX_ ) {
    self.init()
    self.gm = game
    self.title = gm.gmtitle
    let vw = superView.frame.width
    let vh = superView.frame.height
    let svw0 = superView.frame.origin
    view.tag = superView.tag + gm.dex
    let centerPoint = superView.center
    let sz = CGSize(width: vw/gsd, height: vh/gsd)
    let frame = CGRect(origin: svw0, size: sz)
    let vector = CGVector(dx: 1.0, dy: 1.0) // set1 2center
    
    psGrid = PositiveGrid(pvnm: gm.gmtitle + " pgrd" )
    nsGrid = NegativeGrid(pvnm: gm.gmtitle + " ngrd" )
    
    view.frame = frame
    view.center = centerPoint
    view.center.x *= vector.dx
    view.center.y *= vector.dy
    
    childLabel.text = gm.description
    childLabel.sizeToFit()
    view.addSubview(childLabel)
    
//    psGrid.autoresizesSubviews = true
    
  }}
extension ChildVC {
  override func viewDidLoad() {
    vcid = gm.gameName + "_dl_"
    gui(#function + vcid + x0t)
    super.viewDidLoad()
    //    self.view.backgroundColor = .cyan
  }}
class CVCX: ChildVC {
  override func viewDidLoad() {
    super.viewDidLoad()
    assert( gm is Game_X_ )
    //    self.view.backgroundColor = .yellow
    childButton.center.y += 111
  }}
class CVCQ: ChildVC {
  override func viewDidLoad() {
    super.viewDidLoad()
    assert( gm is Game_Q_ )
    //    self.view.backgroundColor = .orange
    childButton.center.y += 222
  }}

extension ChildVC {
  func prepGridViews(mk4: Bool) {
    
    let mult4: CGFloat = mk4 ? 4.0 : 1.0
    let recip: CGFloat = 1.0 / mult4
    print("recip", recip)
    
    let width  = CGFloat(gm.ecHorizontal)
    let height = CGFloat(gm.ecVertical)
    
    var scale = (height / width) * gm.scalePhone
    if UIDevice.current.userInterfaceIdiom == .pad {
      scale = 1.0
    }
    // size
    psGrid.swell(recip * scale)
    nsGrid.swell(recip * 1.0)//FIXME: 1.0 was 2.0
    
    // center
    psGrid.center = view.center
    nsGrid.center = view.center
    
    //    hide_negative_space
    nsGrid.isHidden = !ovrHIDE
    psGrid.isUserInteractionEnabled = true
    nsGrid.isUserInteractionEnabled = false
    
  }
}
