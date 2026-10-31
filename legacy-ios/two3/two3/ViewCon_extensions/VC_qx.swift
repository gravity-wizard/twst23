//
//  VC_qx.swift
//  two3
//
//  Created by G on 11/29/19.
//  Copyright © 2019 akapps. All rights reserved.
//

//
//  VC_hlp.swift
//  two4
//
//  Created by G on 11/17/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import UIKit
import MessageUI
public enum ZBG {
  case pause
  case resume
  case weird
}
public extension ZBG { // zbackground
  var zcolor: UIColor {
    get {
      switch self {
        case .pause:  return UIColor.systemPink
        case .resume: return UIColor.systemGreen
        case .weird:  return UIColor.systemGray//5
      }}}}
struct ZSV { // zsave
  static var bgPause:     UIColor?
  static var bgResume:  UIColor?
  static var bgWeird:   UIColor?
}
public extension VC {
  func bg(_ zbg: ZBG?,
          f:String=#function) {
    print(f, "zbgΔ", zbg as Any)
    
    if z1i == zrv(.norm) { return }
    switch zbg {
      case .pause:
        ZSV.bgPause = view.backgroundColor
        view.backgroundColor = zbg?.zcolor
      case .resume:
        ZSV.bgResume = view.backgroundColor
        //        view.backgroundColor = zbg.zcolor
        view.backgroundColor = ZSV.bgPause
      case .weird:
        if view.backgroundColor == zbg?.zcolor { return }
        view.backgroundColor = zbg?.zcolor
        
        DispatchQueue.main.asyncAfter( //delayRaw
        deadline: .now() + 2.305) {
          print(f, "wrd done")
          self.view.backgroundColor = ZSV.bgWeird
      }
      case .none: print("zbg.none", zbg as Any)
      
    }}}

var g0scoreSlat: ScoreSlat?

// super for timing and VC().function calls
public class VC: UIViewController, MFMailComposeViewControllerDelegate {
  
  //  var g0scoreSlat: g0scoreSlat?
  
  var vcid = "VC"
  // viewControllerIdentifier ==> VCDL at viewDidLoad
  
  //  var popView = UIView()
  let burgerHeight: CGFloat = 57
  
  var mainMenuSlat = MenuSlat()
  var settingMenuSlat = SlatView()
  var tutorialViewSlat = SlatView()
  var grab1bb = Burger(fractions: nil)
  var slatWidth1bb: CGFloat = 200 // fractional if <= 16
  var slatHeight1bb: CGFloat = 2.111 // 2.0 = halfTotalHeight
  
  var popButtonsBB: [UIButton] = []
  var setButtonsBB: [UIButton] = []
  let popNamesBB = MainMenuTitlesBB.allCases
  let setNamesBB = U5EnumTitleBB.allCases
  
  
  //  var g0scoreSlat: g0scoreSlat?
  //    = g0scoreSlat(title: " 23 Slide Puzzle ", times: [0,0], moves: [0,0])
  
  
  
  //  var slat2bt = UIView()
  var topBurger = TopBurger(fractions: nil)
  
  //  let slatWidth1bt: CGFloat = g0sAcrossDefault.dx
  //  let slatHeight1bt:
  
  //  let slatWidth1bt: CGFloat  = 777.777 // fractional if <= 16
  //  let slatHeight1bt: CGFloat = 111.111 // 2.0 = halfTotalHeight
  
  var popButtonsBT: [UIButton] = []
  var setButtonsBT: [UIButton] = []
  let popNamesBT = MainMenuTitlesBB.allCases
  //  let setNamesBT = U5EnumTitleBB.allCases
  
  var etvs: [EdgeTextView] = []
  var edgeLabelsArr: [EdgeLabel] = []
  var edgeButtonsArr: [EdgeButton] = []
  //        var wasFrame: CGRect = .zero
  
  let topView: UIView = UIView(frame: g0sTopRect)
  let gridAlpha: CGFloat = 1.0 // 0.77
  let gridBGC: UIColor = .clear //.green
  
}
//n0t-dark
//let g0sDark = true
//let g0sDark = false
extension VC {
  override public func viewDidLoad() {
    vcid = "VCDL"
    gui(#function + vcid)
    super.viewDidLoad()
    view.addSubview(topView)
    
    // topView.backgroundColor = .cyan // visualize topRect
    
    //    getNowTimeString()
    //    let lite = CCBLU.bluelt.__uiColor()
    //    let dark = CCBLU.bluedrk.__uiColor()
    //    view.bgc( g0sDark ? dark : lite )
    
//    view.backgroundColor = .brown // bad
    
    // wholeScreen // loads faster here, but splits iPad rotation
//        self.view.strechCustomWood(.wgpsd_541099, cornered: 0.0)
    //    movedTo func refreshOuterViews() {
    
    
    
    // D3V-GS-191229a only topHalf of the screen
    
    //    NotificationCenter.default.addObserver(
    //      self, selector: #selector(self.deviceDidRotate),
    //      name: UIDevice.orientationDidChangeNotification, object: nil)
    /// noHelp use UIScreen toFix
    //    UIDevice.current.beginGeneratingDeviceOrientationNotifications()
  }
  @objc func deviceDidRotate() {
    NotificationCenter.default.removeObserver(self, name: UIDevice.orientationDidChangeNotification, object: nil)
    
    let isPortraight = UIDevice.current.orientation.isPortrait
    print("isPortraight", isPortraight)
    
  }
}

