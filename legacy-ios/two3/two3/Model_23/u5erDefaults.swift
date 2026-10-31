//
//  u5erDefaults.swift
//  QXicz
//
//  Created by G on 9/27/19.
//  Copyright © 2019 sdxAGS. All rights reserved.
//
import UIKit
enum U5EnumTitleBB: String, CaseIterable  {
//  case u5soundEffects   = "sound effects"
  case u5lightColors    = "light colors"
}

class U5erButton: UIButton {
  
  var u5isOn = false
  var u5descText = "u5desc"
  
  init(frame: CGRect, text: String) {
    super.init(frame:frame)
    
    u5descText = text
    u5reset()
    //u5setButtonClicked
    /// addTarget in the view controller
  }
  func u5reset() {
    let title =
      NSAttributedString(string: u5descText)
    setAttributedTitle(title, for: .normal)
    u5setPerUserDefault(true)
    u5appearStruck(bool: u5isOn)
//    cornerRadiusRatio(8.0) frm0
  }
  
  func u5toggle() {
    gui(self.title(for: [])!)
    
    if u5isOn {
      u5isOn = false
    } else { u5isOn = true }
    u5appearStruck(bool: u5isOn)
  }
  required init?(coder: NSCoder) {
    fatalError("u5btn wrdimp")
  }
  func u5appearStruck(bool: Bool) {
    gui(u5isOn.description)
    
    let opposite = !bool
    let title = titleLabel!.text
    let newTitle = title?.u5strike(thru: opposite)
    self.setAttributedTitle(newTitle, for: .normal)
    
    title?.u5write(bool: u5isOn)
    assert(title?.u5readBool() == bool) // readBackCorrect
  }
}

extension U5erButton {
  func u5setPerUserDefault(_ newDefaultState: Bool?) {
    if UserDefaults.standard.value(
      forKey: u5descText ) != nil {
      let object = UserDefaults.standard.value(
        forKey: u5descText ) as? NSNumber
      self.u5isOn = (object!.boolValue)
    } else {
      self.u5isOn = newDefaultState!
      UserDefaults.standard.set(
        NSNumber(value: self.u5isOn),
        forKey: self.u5descText)
    }
    gui(u5descText)
  }
}
let intMeansIncrement = 0 - 101
extension String {
  func u5writeNextAdding(_ inc: Int) -> Int {
    let Δ = 1 // prefixChange
    let comps = components(separatedBy: ",")
    
    var val = u5readCurrentInt()
    print(#function, self, comps, val)
    
    val += inc // increment
    if val >= comps.count - Δ { val = 1 }
    
    UserDefaults.standard.set(
      NSNumber(value: val),
      forKey: self)
    gui(self)
    return val
  }
  func u5writeLastNumberComponent(_ value: Int) -> Int {
    
    var nowInt = 0-1
    let comps = components(separatedBy: ",")
    let endComp = comps.last
    let endInt = endComp?.toInt()
    
    if value != 0 {
      nowInt = value // override
    } else { nowInt = endInt! }
    
    print(#function, comps, endInt!)
    assert(endInt! > 0)
    
    UserDefaults.standard.set(
      NSNumber(value: endInt!),
      forKey: self)
    gui(self + nowInt.description)
    return nowInt
  }
  
  func u5readCurrentInt() -> Int {
    var object: NSNumber = 0
    if UserDefaults.standard.value(
      forKey: self ) == nil {
      _ = u5writeLastNumberComponent(0)
    }
    object = (UserDefaults.standard.value(
      forKey: self ) as? NSNumber)!
    //      print("ob_forKey", object, self)
    gui(self)
    return object.intValue
  }
  func u5resetCurrentInt() -> Int {
    var object: NSNumber = 0
    
    _ = u5writeLastNumberComponent(0)
    
    object = (UserDefaults.standard.value(
      forKey: self ) as? NSNumber)!
    let res = object.intValue
    gui(self + res.description)
    return res
  }
}
extension String {
  func u5write(bool: Bool) {
    gui(self + bool.description)
    UserDefaults.standard.set(
      NSNumber(value: bool),
      forKey: self)
  }
  func u5readBool() -> Bool  {

    var object: NSNumber = 0
    if UserDefaults.standard.value(
      forKey: self ) == nil {
      u5write(bool: true)
    }
    object = (UserDefaults.standard.value(
      forKey: self ) as? NSNumber)!
    let res = object.boolValue
    gui(self + res.description)
    return res
  }
}
extension Bool {
  func boolString(_ nm: String = "",
                  f: String = #function) -> String {
    
    let res =  nm + " " + String(describing: self)
    gui(res)
    return  res
  }
}
