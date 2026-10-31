//
//  Gradient_hlp.swift
//  two3
//
//  Created by G on 12/16/19.
//  Copyright © 2019 akapps. All rights reserved.
//
import UIKit

extension CAGradientLayer {
  enum GradPoint {
    case topLeft
    case centerLeft
    case bottomLeft
    case topCenter
    case center
    case bottomCenter
    case topRight
    case centerRight
    case bottomRight
    
    var gradPoint: CGPoint {
      switch self {
      case .topLeft:
        return CGPoint(x: 0, y: 0)
      case .centerLeft:
        return CGPoint(x: 0, y: 0.5)
      case .bottomLeft:
        return CGPoint(x: 0, y: 1.0)
      case .topCenter:
        return CGPoint(x: 0.5, y: 0)
      case .center:
        return CGPoint(x: 0.5, y: 0.5)
      case .bottomCenter:
        return CGPoint(x: 0.5, y: 1.0)
      case .topRight:
        return CGPoint(x: 1.0, y: 0.0)
      case .centerRight:
        return CGPoint(x: 1.0, y: 0.5)
      case .bottomRight:
        return CGPoint(x: 1.0, y: 1.0)
      }
    }
  }
  convenience init(start: GradPoint, end: GradPoint, colors: [CGColor], type: CAGradientLayerType) {
    self.init()
    self.startPoint = start.gradPoint
    self.endPoint = end.gradPoint
    self.colors = colors
    self.locations = (0..<colors.count).map(NSNumber.init)
    self.type = type
  }
}
