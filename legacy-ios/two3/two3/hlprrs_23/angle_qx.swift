//
//  angle_qx.swift
//  two3
//
//  Created by G on 11/29/19.
//  Copyright © 2019 akapps. All rights reserved.
//

//
//  angle24hlp.swift
//  two4
//
//  Created by G on 10/13/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import UIKit
extension Cie {
  func cpShiftedRelativeTo(
    referenceView ref: Pivot,
    byDegrees deg: CGFloat) -> CGPoint {
    
    let deg7qst = deg // + 45
//    print("deg7qst", deg7qst)
    
    if cp0i == .zero { cp0i = center }
    
    var pc: CGPoint = .zero // polarCenter
    var pe: CGPoint = .zero // polarEquivelent
    pc.x = ref.frame.width/2 //+ ref.frame.origin.x
    pc.y = ref.frame.height/2 //+ ref.frame.origin.y
//            let x = UILabel()
//            x.text = " x "
//            x.sizeToFit()
//            x.center = pc
//            x.backgroundColor = .white
////            self.superview?.addSubview(x)
//            ref.superview?.addSubview(x)
    let dx = 0 + cp0i.x - pc.x
    let dy = 0 + cp0i.y - pc.y
    let r2 = dx*dx + dy*dy
    let r = CGFloat(sqrt(r2))
    let theta = atan2(dy, dx) * 180/CGFloat.pi
    
    let newTheta = theta + deg7qst
    let newDY = r * newTheta.cgSine()
    let newDX = r * newTheta.cgCosine()
    pe.x = CGFloat(newDX) + pc.x
    pe.y = CGFloat(newDY) + pc.y
    return pe
  }
}
//https://stackoverflow.com/questions/8260018/objective-c-rectangular-cgpoint-to-polar-cgpoint
extension CGFloat {
  func cgSine() -> CGFloat {
    return sin(self.cgRadians())
  }
  func cgCosine() -> CGFloat {
    return cos(self.cgRadians())
  }
  func cgTangent() -> CGFloat {
    return tan(self.cgRadians())
  }
  func cgRadians() -> CGFloat {
    return self * CGFloat.pi / 180
  }
}

