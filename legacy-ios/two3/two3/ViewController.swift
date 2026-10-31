//
//  ViewController.swift
//  two3
//
//  Created by G on 11/29/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import SwiftUI

class ViewController: VC {
  // not used
   @IBOutlet weak var coolButton: CoolButton!
  
  var vcStableView = CenterView(pvnm: "cv0n")
//    Pivot(nm: "stab0n") // N0
  var vcGridArr: [Grid] = []
  
  var toggle: Flipper = Flipper( [] )
  //   var togg = Flipper( [" TruX ", " NotX "] )
  // ^^^ Sibling objects ^^^
  
  let tag = 2203192223
//  var wasFrame = CGRect()
  var childArr: [ChildVC] = []
  
  override var prefersStatusBarHidden: Bool {
    return true // ovrHIDE
  }}

enum WoodGrain: String {
  
  case wgLite    = "wgPLYwt2h.png"
  case wgDark    = "wg078fst2h.png"
  case wgBurger  = "wg121gg2h.png"
  
  // wholeScreenBackgrounds
  case wgpsd_541099 = "wgpsd_541099.psd"

}
extension UIView {
  func strechCustomWood(_ grain: WoodGrain,
                        cornered: CGFloat?,
                        u:String=#function) {
      
      if UIImage(named: grain.rawValue) == nil {
        gui(u + "wg0+xt" + grain.rawValue)
      }
      UIGraphicsBeginImageContext(frame.size)
      UIImage(named: grain.rawValue)?.draw(in: self.bounds)
      let image = UIGraphicsGetImageFromCurrentImageContext()
      UIGraphicsEndImageContext()
      backgroundColor = UIColor.init(patternImage: image!)
      
//    cornerRadiusRatio(nil)
    cornerRadiusRatio(cornered)
    
    }
  func tileCustomWood(_ grain: WoodGrain) {
    if let image = UIImage(named: grain.rawValue) {
      backgroundColor = UIColor(patternImage: image)
    } else {
      print("wrd missing", grain)
    }
  }
}

extension ViewController {
  //  override func viewDidAppear(_ animated: Bool) {}
  
  //  class ViewController: UIViewController {
  //    @IBOutlet weak var coolButton: CoolButton!
  @IBAction func hueValueChanged(_ sender: Any) {
    guard let slider = sender as? UISlider else { return }
    coolButton.hue = CGFloat(slider.value)
    for kid in childArr {
      for d in kid.dice {
        d.hue = CGFloat(slider.value)
      }
      for c in kid.psCice {
        c.hue = CGFloat(slider.value)
      }
    }}
  @IBAction func saturationValueChanged(_ sender: Any) {
    guard let slider = sender as? UISlider else { return }
    coolButton.saturation = CGFloat(slider.value)
    for kid in childArr {
      for d in kid.dice {
        d.saturation = CGFloat(slider.value)
      }
      for c in kid.psCice {
        c.saturation = CGFloat(slider.value)
      }
    }}
  @IBAction func brightnessValueChanged(_ sender: Any) {
    guard let slider = sender as? UISlider else { return }
    coolButton.brightness = CGFloat(slider.value)
    for kid in childArr {
      for d in kid.dice {
        d.brightness = CGFloat(slider.value)
      }
      for c in kid.psCice {
        c.brightness = CGFloat(slider.value)
      }
    }}
  
  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    
//    addBackGroundImageView()
  }
  func addBackGroundImageView() {
    
    let tag_bgiv = 27922
    var was: UIView?
    for sv in view.subviews {
      // backGroundImageView
      if sv.tag != tag_bgiv { continue }
      was = sv
    }
    
    let bgiv = UIImageView()
    //    bgiv.bounds = view.bounds
    bgiv.tag = tag_bgiv
    bgiv.alpha = 0.70
    bgiv.frame = view.frame
//    self.view.strechCustomWood(.pngtr_541099psd)
//    bgiv.strechCustomWood(.bgLake)
    //    bgiv.strechCustom(woodGrain: .bgKapaa)
    view.insertSubview(bgiv, at: 0)
    view.bgc(.black)

    let when = DispatchTime.now() + 0.0200
    DispatchQueue.main.asyncAfter(deadline: when) {
      
      was?.removeFromSuperview()
    }
  }}// MARK: VDLMEP
// n0t-doubleTouching }} means same extention
// n0t-VDLmainEntryPoint
extension ViewController {
  override func viewDidLoad() {
    super.viewDidLoad()
    vcid = "vcdl"
    view.tag = tag
    j1d.ui("jday")
    gui(#function + vcid + x0t)
    removeCoolViews()
//    opUserDefaults(zcpU5op)
    //      actIAWuserDefaults()
    g0vPortraight = ckP0RTrait()
    
    // prevent white flash
    view.backgroundColor = .brown
    
//    g0vDevice = getCurrentDevice()
//        addBackGroundImageView()

//    let mk4 = true
    let mk4 = false
    childArr = addChildVCarr(make4: mk4)
    
    view.addSubview(vcStableView)
//    vcStableView.center = view.center
    
    if (skpFLIP == 1) { return Void() }
    self.toggAsNewFlipper()
    view.addSubview(toggle)
    view.addSubview(toggle.echo)
    view.addSubview(toggle.echo.button)
    
    self.vcConfigDidChange()
    simToggle(flipper: toggle)
    
    checkOrientation(0.100)
    
  }}
extension ViewController {
  func vcConfigDidChange(u:String=#function) {
    gui(#function + u + x0t)
    for ch in childArr {
      ch.configurationDidChange()
    }}
}
