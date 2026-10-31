//
//  coolDrawing.swift
//  two3
//
//  Created by G on 12/25/19.
//  Copyright © 2019 akapps. All rights reserved.
//

/// Copyright (c) 2019 Razeware LLC
///
/// Permission is hereby granted, free of charge, to any person obtaining a copy
/// of this software and associated documentation files (the "Software"), to deal
/// in the Software without restriction, including without limitation the rights
/// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
/// copies of the Software, and to permit persons to whom the Software is
/// furnished to do so, subject to the following conditions:
///
/// The above copyright notice and this permission notice shall be included in
/// all copies or substantial portions of the Software.
///
/// Notwithstanding the foregoing, you may not use, copy, modify, merge, publish,
/// distribute, sublicense, create a derivative work, and/or sell copies of the
/// Software in any work that is designed, intended, or marketed for pedagogical or
/// instructional purposes related to programming, coding, application development,
/// or information technology.  Permission for such use, copying, modification,
/// merger, publication, distribution, sublicensing, creation of derivative works,
/// or sale is expressly withheld.
///
/// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
/// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
/// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
/// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
/// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
/// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
/// THE SOFTWARE.

import UIKit
import CoreGraphics

extension UIView {
  func createRoundedRectPath(for rect: CGRect, radius: CGFloat) -> CGMutablePath {
    let path = CGMutablePath()
    
    let midTopPoint = CGPoint(x: rect.midX, y: rect.minY)
    path.move(to: midTopPoint)
    
    let topRightPoint = CGPoint(x: rect.maxX, y: rect.minY)
    let bottomRightPoint = CGPoint(x: rect.maxX, y: rect.maxY)
    let bottomLeftPoint = CGPoint(x: rect.minX, y: rect.maxY)
    let topLeftPoint = CGPoint(x: rect.minX, y: rect.minY)
    
    path.addArc(tangent1End: topRightPoint, tangent2End: bottomRightPoint, radius: radius)
    path.addArc(tangent1End: bottomRightPoint, tangent2End: bottomLeftPoint, radius: radius)
    path.addArc(tangent1End: bottomLeftPoint, tangent2End: topLeftPoint, radius: radius)
    path.addArc(tangent1End: topLeftPoint, tangent2End: topRightPoint, radius: radius)
    
    path.closeSubpath()
    
    return path
  }
  
  func drawLinearGradient(
    context: CGContext, rect: CGRect, startColor: CGColor, endColor: CGColor) {
    
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let colorLocations: [CGFloat] = [0.0, 1.0]
    let colors: CFArray = [startColor, endColor] as CFArray
    let gradient = CGGradient(
      colorsSpace: colorSpace, colors: colors, locations: colorLocations)!
    
    let startPoint = CGPoint(x: rect.midX, y: rect.minY)
    let endPoint = CGPoint(x: rect.midX, y: rect.maxY)
    
    context.saveGState()
    context.addRect(rect)
    context.clip()
    context.drawLinearGradient(
      gradient, start: startPoint, end: endPoint, options: [])
    context.restoreGState()
  }
  
  func drawGlossAndGradient(context: CGContext, rect: CGRect, startColor: CGColor, endColor: CGColor) {
    drawLinearGradient(
      context: context, rect: rect, startColor: startColor, endColor: endColor)
    
    let glossColor1 = UIColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 0.35)
    let glossColor2 = UIColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 0.1)
    
    let topHalf = CGRect(
      origin: rect.origin, size: CGSize(width: rect.width, height: rect.height/2))
    
    drawLinearGradient(context: context, rect: topHalf,
                       startColor: glossColor1.cgColor, endColor: glossColor2.cgColor)
  }
}

