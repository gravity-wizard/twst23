//
//  view_hlp_23.swift
//  two3
//
//  Created by G on 11/29/19.
//  Copyright © 2019 akapps. All rights reserved.
//
//
//  view_hlp.swift
//  two4
//
//  Created by G on 10/12/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import UIKit
public
extension
UIView { // 2.0 for square__circle or nil for default
  func cornerRadiusRatio(_ ratio: CGFloat?, u:String=#function) {
    if ratio ?? 12.0 < CGFloat(0.1) { return }
    clipsToBounds = true
    let averageEdgeLength = (
      frame.height + frame.width) / 2.0
    if frame == .zero { gui(u + "frm0+xt") }
    layer.cornerRadius = averageEdgeLength / (ratio ?? 12.0)
  }
}

extension UIView {
  func narVWmutate(_ pwr: CGFloat) {
    frame.size.width.narCGFmutate(pwr)
  }
}
extension CGFloat {
  mutating func narCGFmutate(_ pwr: CGFloat) {
    let raisedNAR = pow(nar, pwr)
    self /= raisedNAR
  }
  func narCGFreturn(_ pwr: CGFloat) -> CGFloat {
    
    let narNow = nar.description
    print(nar, msw, msh)
    gui(narNow)

    return self/pow(nar, pwr)
  }
}
extension Int {
  func int__narCGF(_ power:CGFloat) -> CGFloat {
    return(CGFloat(self).narCGFreturn(power))
  }
}

extension UIView {
  func lockUIvw() {
    for sv in self.subviews {
      sv.isUserInteractionEnabled = false
    }}
  func unlockUIvw() {
    for sv in self.subviews {
      sv.isUserInteractionEnabled = true
    }}
}
extension UIView {
  func setTagCG(i cgi: CGFloat) -> Bool {
    return setTag(i: Int(cgi))
  }
  func setTag(i : Int,
              u: String = #function) -> Bool {
    
    
//    var sum = tag
    var base: G0base?
    
    switch self {
      case is Aura: break//     base = .aura
      case is Cie: break//      base = .cie
      case is Die: break//     base = .die
      
      case is Stat:     base = .statAny
      case is MoveStat:  base = .statAny // same
      case is TimeStat:  base = .statAny // oneArray
      
      case is StatView:     break// base = .statView
      case is MoveStatView: break// base = .moveStatView
      case is TimeStatView: break// base = .timeStatView

      case is SlatView:     break//   base = .slatView
      case is ScoreSlat:    break//   base = .slatScore
      case is Burger:       break//   base = .burger
      case is TopBurger:       break//   base = .burger

      case
      is EdgeLabel:     base = .edgeLabel
      case
      is EdgeButton:    base = .edgeButton
      case
      is EdgeTextView:  base = .edgeText
      case
      is PositiveGrid: break//  base = .gridPositive
      case
      is NegativeGrid: break//  base = .gridNegative
//      case is MoveStat:  base = .statMove
//      case is TimeStat:  base = .statTime // seperateArrays
      default: base = nil
    }
    let found = base != nil
    if found { tag = base!.rawValue + i }
//    let u2 = #function; print(u2, i, u, classForCoder, base, tag, found)
//    print(u2, u, base!) mayCrash
    
    return found
  }
}
func drawLine(_ points: [CGPoint],
              ofColor lineColor: UIColor,
              inView view:UIView) {
  
  if z1i < zrv(.lines) { return }
  
  let end = points[1]
  let start = points[0]
  
  //design the path
  let path = UIBezierPath()
  path.move(to: start)
  path.addLine(to: end)
  
  //design path in layer
  let shapeLayer = CAShapeLayer()
  shapeLayer.path = path.cgPath
  shapeLayer.strokeColor = lineColor.cgColor
  shapeLayer.lineWidth = 1.0
  
  view.layer.addSublayer(shapeLayer)
}
extension ChildVC {
  func topCiePoints() -> [CGPoint] {
    let boty = view.bounds.maxY
    let topy = view.bounds.minY
    
    var hiy = boty // workUp
    for c in psCice {
      hiy = min(hiy, c.frame.origin.y)
    }
    hiy -= psGrid.frame.origin.y
    let gap = abs(hiy - topy)
    
    let sp = CGPoint(x: 0, y: hiy - gap/2)
    let endX = view.frame.size.width
    let ep = CGPoint(x: endX, y: hiy - gap/2)
    drawLine([sp, ep],
             ofColor: .red,
             inView: psGrid)
    return [sp, ep]
  }
}
extension UIView {
  func slashPoints() -> [CGPoint] {
    let topLeft: CGPoint = .zero
    var botRght: CGPoint = .zero
    botRght.x = frame.size.width
    botRght.y = frame.size.height
    //        drawLine(points: [topLeft, botRght],
    //                 ofColor: .red, inView: self)
    return [topLeft, botRght]
  }
  func linesCrossVw(
    _ foo: [CGPoint], // forwardSlash
    _ bck: [CGPoint]) // backSlash (start, end) points
    -> CGPoint? {
      
      drawLine(foo, ofColor: complementary(nil), inView: self)
      drawLine(bck, ofColor: complementary(nil), inView: self)
      
      let end1 = foo[1]
      let end2 = bck[1]
      let start1 = foo[0]
      let start2 = bck[0]
      // calculate the differences
      let delta1x = end1.x - start1.x
      let delta1y = end1.y - start1.y
      let delta2x = end2.x - start2.x
      let delta2y = end2.y - start2.y
      
      // create a 2D matrix from our vectors and calculate the determinant
      let determinant = delta1x * delta2y - delta2x * delta1y
      
      if abs(determinant) < 0.0001 {
        print("// the lines are parallel")
        return nil
      }
      // coefficients both between 0 and 1 then  intersection
      let ab = ((start1.y - start2.y) * delta2x
        - (start1.x - start2.x) * delta2y) / determinant
      
      if ab > 0 && ab < 1 {
        let cd = ((start1.y - start2.y) * delta1x
          - (start1.x - start2.x) * delta1y) / determinant
        
        if cd > 0 && cd < 1 {
          // lines cross
          let intersectX = start1.x + ab * delta1x
          let intersectY = start1.y + ab * delta1y
          return CGPoint(x: intersectX, y: intersectY)
        }
      }
      print("// lines don't cross")
      return nil
  }
  func markA(point: CGPoint) -> UILabel {
    
    //        for sv in subviews {
    //            if sv.tag == x { sv.removeFromSuperview() }
    //        }
    let mrk = UILabel()
    mrk.tag = G0tag.xCenter.rawValue
    mrk.text = "X"
    mrk.sizeToFit()
    //        addSubview(mrk)
    mrk.center = point
    mrk.textColor = backgroundColor
    mrk.backgroundColor = complementary(nil)
    return mrk
  }
  func complementary(_ color: UIColor?) -> UIColor {
    
    guard let clr =
      // send nil to complement backgroundColor
      color ?? self.backgroundColor ?? superview?.backgroundColor
      
      else { return .magenta }
    
    let ciColor = CIColor(color: clr)
    //  difference from white:
    let compRed: CGFloat = 1.0 - ciColor.red
    let compGreen: CGFloat = 1.0 - ciColor.green
    let compBlue: CGFloat = 1.0 - ciColor.blue
    
    return UIColor(red: compRed,
                   green: compGreen,
                   blue: compBlue,
                   alpha: 1.0)
  }}
extension UIView {
  func mirrorXarr(pnts:[CGPoint]) -> [CGPoint] {
    var arr:[CGPoint] = []
    
    for p in pnts {
      let mirXp  = mirrorX(point: p)
      arr.append(mirXp)
    }
    drawLine(arr, ofColor: complementary(nil), inView: self)
    
    return arr
  }
  func mirrorX(point:CGPoint) -> CGPoint {
    let mirX = frame.width - point.x
    let mirY = point.y
    //        let mirrorPoint = CGPoint(x: mirX, y: mirY)
    return CGPoint(x: mirX, y: mirY)
  }
  func mirrorYarr(pnts:[CGPoint]) -> [CGPoint] {
    var arr:[CGPoint] = []
    
    for p in pnts {
      let mirYp  = mirrorY(point: p)
      arr.append(mirYp)
    }
    drawLine(arr, ofColor: complementary(nil), inView: self)
    
    return arr
  }
  func mirrorY(point:CGPoint) -> CGPoint {
    let mirX = point.x
    let mirY = frame.height - point.y
    //        let mirrorPoint = CGPoint(x: mirX, y: mirY)
    return CGPoint(x: mirX, y: mirY)
  }
}

struct Point {
  var x: CGFloat
  var y: CGFloat
}

struct Line {
  var p1: Point
  var p2: Point
  
  var slope2: CGFloat {
    guard p1.x - p2.x != 0.0 else { return .nan }
    
    let dx = p1.x - p2.x
    let dy = p1.y - p2.y
    print("dx.dy", dx, dy)
    
    return dy / abs(dx)
  }
  
  func intersection(of other: Line) -> Point? {
    print("self", self)
    print("other", other)
    
    let ourSlope = slope2
    let theirSlope = other.slope2
    
    guard ourSlope != theirSlope else { return nil }
    
    if ourSlope.isNaN && !theirSlope.isNaN {
      return Point(x: p1.x, y: (p1.x - other.p1.x) * theirSlope + other.p1.y)
    } else if theirSlope.isNaN && !ourSlope.isNaN {
      return Point(x: other.p1.x, y: (other.p1.x - p1.x) * ourSlope + p1.y)
    } else {
      let x = (ourSlope*p1.x - theirSlope*other.p1.x + other.p1.y - p1.y) / (ourSlope - theirSlope)
      
      let y = theirSlope*(x - other.p1.x) + other.p1.y
      
      return Point(x: x, y: y)
    }
  }
}
extension UIView {
  func offsetYarr(_ pnts:[CGPoint]) -> [CGPoint] {
    
    var arr: [CGPoint] = []
    
    for p in pnts {
      arr.append(offsetYpnt(p))
    }
    return arr
  }
  func offsetYpnt(_ pnt:CGPoint) -> CGPoint {
    
    let ox = pnt.x
    let oy = pnt.y + frame.origin.y
    
    return CGPoint(x: ox, y: oy)
  }
  func midXarr(pnts: [CGPoint]) -> CGPoint {
    
    let my = pnts[0].y
    assert(abs(my - pnts[1].y) < 0.01)
    
    let xs = pnts[0].x
    let xe = pnts[1].x
    let mx = (xe + xs)/2
    
    return CGPoint(x: mx, y: my)
  }
  func offsetView(_ pnt:CGPoint) -> CGPoint {
    
    let ox = pnt.x + frame.origin.x
    let oy = pnt.y + frame.origin.y
    
    return CGPoint(x: ox, y: oy)
  }
}
extension UIView {
  func shift(percent: CGVector) {
    let dx = frame.width/100 * percent.dx
    let dy = frame.width/100 * percent.dy
    
    shift(dx: dx, dy: dy)
  }
  func shift(dx: CGFloat, dy: CGFloat) {
    center.x += dx
    center.y += dy
  }
  
  func swell(_ multiplier: CGFloat) {
    // > 1.0 or < 1.0 to shrink
    assert(multiplier > 0.01)
    
    let wasCenterPoint = center
    frame.size.width = frame.width * multiplier
    frame.size.height = frame.height * multiplier
    
//    setNeedsDisplay()
    center = wasCenterPoint
  }}
extension UIView {
  fileprivate
  func shrinkCopy(_ scale: CGFloat) -> Replica {
    
    let xc = center.x * scale
    let yc = center.y * scale
    let newcntr = CGPoint(x: xc, y: yc)
    
    let szx = frame.size.width * scale * transform.a
    let szy = frame.size.height * scale * transform.a
    let sz = CGSize(width: szx, height: szy)
    let rect = CGRect(origin: .zero, size: sz)
    let rep = Replica(frame: rect)
    rep.center = newcntr
    rep.tag = tag
    rep.alpha = alpha * 0.90
    rep.transform = transform
    rep.bgc( self.backgroundColor ?? .clear )
    
    return rep
  }
  internal func replicate(scale: CGFloat) -> Replica {
    var arr: [UIView] = []
    let shrinkCopy = self.shrinkCopy(scale)
    
    for sbvw in subviews {
      let svCopy = sbvw.shrinkCopy(scale)
      
      if !sbvw.frame.intersects(self.frame) { continue } // hideNegativeSpace
      
      arr.append(svCopy)
      shrinkCopy.addSubview(svCopy)
    }
//    shrinkCopy.isHidden = true
    return shrinkCopy
  }
}
extension UIView {
  func bgc(_ bgc: UIColor, u:String=#function) {
//    print(u, bgc)
    backgroundColor = bgc
  }
  func zbgc(_ zvrb: ZVerb, _ newBGC: UIColor) {
    if abs(z1d - zvrb.rawValue) > 1 { return }
    backgroundColor = newBGC // changeBGC
  }
  func fbgc(_ fbgc: FuncColor, u:String=#function) {
    print(u, fbgc)
    
    alpha = 1.0
    isHidden = false
    backgroundColor = fbgc.value
  }
}

extension UIView {
  func add4corner(views: [UIView]) {
    
    assert(views.count == 4)
    views[0].removeFromSuperview()
    views[1].removeFromSuperview()
    views[2].removeFromSuperview()
    views[3].removeFromSuperview()
    
    let fw = frame.width
    let fh = frame.height
    
    let w0 = views[0].frame.width
    let h0 = views[0].frame.height
    let w1 = views[1].frame.width
    let h1 = views[1].frame.height
    let w2 = views[2].frame.width
    let h2 = views[2].frame.height
    let w3 = views[3].frame.width
    let h3 = views[3].frame.height
    
    let cnt0 = CGPoint(x: w0/2, y: h0/2)
    views[0].center = cnt0
    let cnt1 = CGPoint(x: w1/2, y: fh - h1/2)
    views[1].center = cnt1
    let cnt2 = CGPoint(x: fw - w2/2, y: fh - h2/2)
    views[2].center = cnt2
    let cnt3 = CGPoint(x: fw - w3/2, y: h3/2)
    views[3].center = cnt3
    
    addSubview(views[0])
    addSubview(views[1])
    addSubview(views[2])
    addSubview(views[3])
  }
}

extension UIView {
  func resize__fit(size: CGSize) {
    
    let szb4 = frame.size
    let wb4 = szb4.width
    let hb4 = szb4.height
    
    let sclw = size.width  / wb4
    let sclh = size.height / hb4
    
    for sv in subviews {
//      let wasCP = sv.center
      sv.frame.size.width  *= sclw
      sv.frame.size.height *= sclh
      sv.center.x *= sclw
      sv.center.y *= sclh
    }
    frame.size = size
  }
}
public
extension // MARK: UIVIEW and VC round ends and UNDERLAYS
UIView {
    func roundEnds(_ stretch: CGFloat) {
        //  < 1 or negative to shrink
        if stretch - CGFloat(Int(stretch)) == 0 {
            frame.size.width += stretch // add if integer
        } else { frame.size.width *= stretch // multiply floats
        }
        layer.cornerRadius = frame.size.height/2
        clipsToBounds = true
    } // VC to use
    func underlayVW(_ color: UIColor?, _ alpha: CGFloat) -> UIView {
        
        var a7 = alpha
        var c7 = color
        if a7 == 0 { a7 = 0.5000 }
        if c7 == nil { c7 = self.backgroundColor }
        
        let copy = UIView(frame: self.frame)
        copy.alpha = a7
        copy.backgroundColor = c7
        copy.layer.cornerRadius = self.layer.cornerRadius
        copy.tag = -211404
        
        return copy
    }}
public extension UIViewController {
    func removeUnderlays() {
        for sv in self.view.subviews {
            if sv.tag != -211404 { continue }
            sv.removeFromSuperview()
        }}
    func underlayVC(_ vw: UIView, _ n:Int) {
        for _ in 0..<n {
            view.addSubview(vw.underlayVW(nil, 1))
        }
        view.addSubview(vw) // add onTop
    }
}
extension UIView {
  /// prep(add as subview)
  func auto(color: UIColor?,
            u: String = #function) -> UIColor {
    let u2 = #function
    print(u2, color as Any, u, self.tag)
//          backgroundColor as Any, superview?.backgroundColor as Any)
    let compareBGC: UIColor? = backgroundColor ?? superview?.backgroundColor
    let bgLite = UIColor.gray.hsba.brightness < compareBGC?.hsba.brightness ?? 0.50
    
    var color7: UIColor = bgLite ? .black : .white
    if compareBGC == nil { color7 = color ?? .magenta }
    
    return color7
    
  }}
extension UIView {
  func shiftSubviewsRightFor(game: Game, u: String = #function) {
    let u2 = #function; print(u2, game, u, game.didShift)
    
    if game is Game_X_ { return }

    var minLeft:  CGFloat = frame.width // * 0.0
    var maxRight: CGFloat = 0.0
    
    for sv in subviews {
      minLeft  = min(minLeft, sv.frame.minX)
      maxRight = max(maxRight, sv.frame.maxX)
    }
    var half: CGFloat = 0.75
    // half width of the empty space on right
    // https://www.tutorialspoint.com/detect-current-device-with-uiuserinterfaceidiom-in-swift
    let shifter = game.shifter
    let frameWidth = frame.width
    let rightShift = (frameWidth - (maxRight - minLeft)) * half
    
    if UIDevice.current.userInterfaceIdiom == .phone {
      half = (1.0 - (1.0 / shifter))
    }
    
    if game.didShift { return }
    
    for sv in subviews {
      sv.center.x += rightShift * half
    }
    game.didShift = true
    
  }}

