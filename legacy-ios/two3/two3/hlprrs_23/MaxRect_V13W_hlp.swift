//
//  MaxRect_V13W_hlp.swift
//  two3
//
//  Created by G on 11/29/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import UIKit

extension UIView { // n0t-sd freeSpaceDivisor
  func vwMaxSqarSize(sd: CGFloat) -> CGSize {
    let w = frame.width
    let h = frame.height
    let mx = min( w, h ) / sd //
    let mxsz = CGSize(width: mx, height: mx)
//    print(tag, #function, w, h, mx, mxsz)
    return mxsz
  }}

public extension CGSize {
func szMaxSqar() -> CGRect {
  var result = CGRect()
  result.size = self
//  print(#function, self)
  return result
}}

public extension UIViewController {
  func vcMaxSqar(sd: CGFloat) -> CGRect {
//    print(view.tag, #function)
    return view.vwMaxSqar(sd:sd)
  }}
public extension UIView {
  func vwMaxSqar(sd: CGFloat) -> CGRect {
    
    let maxSize = vwMaxSqarSize(sd: sd)
    return maxSize.szMaxSqar()
  }}

extension CGFloat {
    func pwr(_ ex: Double) -> CGFloat {
        return pow(self, CGFloat(ex))
    }
}
extension UIView {
    func scaleWidth(_ ex: Double) -> CGFloat {
//        var sclw = frame.width
        var result = min(frame.width, frame.height)
        result = result.pwr(ex)
        return result
    }
    func scaleHeight(_ ex: Double) -> CGFloat {
//        var sclh = frame.width
        var result = min(frame.width, frame.height)
        result = result.pwr(ex)
        return result
    }
}


