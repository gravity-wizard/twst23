//
//  ZVerb_z1int.swift
//  two3
//
//  Created by G on 11/29/19.
//  Copyright © 2019 akapps. All rights reserved.
//
import UIKit
enum ZVerb: Double {
  case base   = 10
//  case jday     = 104
  case norm     = 100
  case xtra     = 200
  case dbug     = 300
  case notes    = 400
  case lines    = 500
  case centSq   = 200.9330
  case jday0    = 111.93310448 // brakeCheck 2019/11/27 04:48
//  case jday     = 111.93320805
  case pvcv     = 111.93320807 // now
  case make4    = 200.93400325 // 3:25am
}
var z1i = Int(z1d)
//  + zdelta
let z1d: Double = 100
//201
//  ZVerb.make4.rawValue
//  + Double(zdelta)
// julianDayMultiplier
let jdm = 10000.00
//let z1d = 111.9332
//let j1d = ZVerb.jday.rawValue
let j1d = jdayNow(year: 2019)

let z1alpha: CGFloat = 0.876


func setZ1i(
  to: Int,
  f:String=#function) -> Bool {
  let now = z1i
  let nxt = to
  let changed = now != nxt
  if changed {
    print(f, "z1i b4af", now, nxt)
    z1i = nxt
  }
  return changed
}
func getZ1int(_ zvrb: ZVerb) -> Double {
  return zvrb.rawValue
}
let zcpU5op: U5operation = .reset
// zcontrolPanel userDefaults
enum U5operation {
  case read
  case reset
}
var clockYposition: YPOS = .notset
//enum D3VIC3 {
//  case ipddvc
//  case iphdvc
//  case osxdvc
//  case wtchdvc
//  case unknown
//}
func zck(_ zvrb: ZVerb) -> Bool {
  return z1i >= Int(zvrb.rawValue)
}
func zrv(_ zvrb: ZVerb, f:String=#function) -> Int {
  return Int(zvrb.rawValue)
}
func zrvd(_ zvrb: ZVerb, f:String=#function) -> Double {
  return zvrb.rawValue
}

