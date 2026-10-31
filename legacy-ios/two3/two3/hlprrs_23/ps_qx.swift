//
//  ps_qx.swift
//  two3
//
//  Created by G on 11/29/19.
//  Copyright © 2019 akapps. All rights reserved.
//
//
//  PS.swift
//  two4
//
//  Created by G on 10/18/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import UIKit
extension NSObject {
  func brake(yr: Int) {
    _ = jdayNow(year: yr)
  }}
let nowyr = 2019
func ckj(_ vrb: ZVerb, _ within: Int, ms:String,
         f: String = #function,
         l: String = String(#line)) -> Bool {
  
  let v1d = vrb.rawValue
  let jrm = j1d.truncatingRemainder(dividingBy: 1)
  let vrm = v1d.truncatingRemainder(dividingBy: 1)
  
  let ji = Int(jrm * jdm)
  let vi = Int(vrm * jdm)
  let diff = abs(ji - vi)
  let res = diff <= within
  print(f, "ckjp", z1i, j1d, v1d, res, diff, within)
  
  if res {
//    print(res, z1i, zrv(.jday))
    print(f,"ckj", ms, res)

  }
  return res
}
func jdayNow(year: Int) -> Double {
  //    let now = NSDate()
  let calendar = Calendar.current
  var components = DateComponents()
  components.day = 0
  components.month = 1
  components.year = year
  components.hour = 0
  components.minute = 0
  let dt2019 = calendar.date(from: components)!
  let frm = 0-dt2019.daysFromNow
  
  let res = Double(frm + 9000)/10000
  print("j1d = jdayNow(year: 2019)", res)
  
  
  return res
}
extension Date {
  var daysFromNow: Int {
    return Calendar.current.dateComponents([.day], from: Date(), to: self).day!
  }
}

