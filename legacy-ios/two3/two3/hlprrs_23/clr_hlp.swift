//
//  clr_hlp.swift
//  two3
//
//  Created by G on 12/3/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import SwiftUI

public enum FuncColor {
  case halt
  case abort
  case weird
}
public extension FuncColor {
  var value: UIColor {
    get {
      switch self {
      case .halt:   return .systemRed
      case .abort:  return .systemTeal
      case .weird:  return .systemPink
      }}
  }}
//MARK: read "__" as to, as in "convert to".
extension Int {
  func __uiColor() -> UIColor {
//    assert(self > 0xFFFFF00)
    let r, g, b, a: CGFloat
    r = CGFloat((self & 0xff000000) >> 24) / 255
    g = CGFloat((self & 0x00ff0000) >> 16) / 255
    b = CGFloat((self & 0x0000ff00) >> 8) / 255
    a = CGFloat(self  & 0x000000ff) / 255
    return UIColor(red: r, green: g, blue: b, alpha: a)
  }
}
// https://www.colorcombos.com/color-schemes/6343/ColorCombo6343.html
//struct CC6343 {
struct CCBLU {
  // cinnibar
  static let red      = 0xE04836ff
  // jaffa
  static let orange   = 0xF39D41ff
  // kumera
  static let brown    = 0x8D5924ff
  // steelBlue
  static let bluelt   = 0x5696BCff
  // midnightBlue
  static let bluedrk  = 0x2F5168ff
  // white
  static let white    = 0xFFFFFFff
  
  // sailorBlue
  static let bluemdm      = 0x00203Fff
  static let mint         = 0xADEFD1ff
  
  static let duskyCitron  = 0xE3CD81ff
  static let coolGray     = 0xB1B3B3ff
  
  static let brownSugar   = 0xA07855ff
  static let beige        = 0xD4B996ff
  
  static let clearHex     = 0x00000000
  
  // https://www.designwizard.com/blog/design-trends/colour-combination
}
// n0t-u5
//MARK: U5 is abreviation for U5SER / userSetting
//class U5 {
//  var tile = true
//  var vcbg = true
//  var clock = false // dark6 byDefault
//  init(tile: Bool, vcbg: Bool, clock5u: Bool) {
//    self.tile = tile
//    self.vcbg = vcbg
//    self.clock = clock5u
//  }
//}

public extension UIColor {
    var rgba: (red: CGFloat, green: CGFloat, blue: CGFloat, alpha: CGFloat) {
        var r: CGFloat = 0
        var g: CGFloat = 0
        var b: CGFloat = 0
        var a: CGFloat = 0
        self.getRed(&r, green: &g, blue: &b, alpha: &a)
        return (r, g, b, a)
    }
    var hsba: (hue: CGFloat, saturation: CGFloat, brightness: CGFloat, alpha: CGFloat) {
        var h: CGFloat = 0
        var s: CGFloat = 0
        var b: CGFloat = 0
        var a: CGFloat = 0
        self.getHue(&h, saturation: &s, brightness: &b, alpha: &a)
      
        return (h, s, b, a)
    }
}

extension Int {
  func __complemetary() -> UIColor {
    return complementary( self.__uiColor() )
  }
}
func complementary(_ color: UIColor) -> UIColor {
    
  let ciColor = CIColor(color: color)
  //  difference from white:
  let compRed: CGFloat = 1.0 - ciColor.red
  let compGreen: CGFloat = 1.0 - ciColor.green
  let compBlue: CGFloat = 1.0 - ciColor.blue
  
  return UIColor(red: compRed,
                 green: compGreen,
                 blue: compBlue,
                 alpha: 1.0)
}
