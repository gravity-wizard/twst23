//
//  Arrbel.swift
//  two4
//
//  Created by G on 10/21/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import UIKit
//directional_arrow_label
class Arrbel: UILabel {}
internal
extension ChildVC {
  func addArrowsTo(
    dyce: [Die],
    game: Game) {
    for d in dyce {
      for a in d.dir8bels {
        a.removeFromSuperview()
      }
      d.dir8bels = []
      d.dir8bels = add8arrbels(
        d.dir8mask, vw: d.ara, game: game)
    }
    
  }}
fileprivate extension ChildVC {
  func add8arrbels(
    _ mask: Int,
    vw:UIView,
    game: Game) -> [Arrbel] {
    assert(mask < 256)
    var i:CGFloat = 0-1
    var res:[Arrbel] = []
    let wiseBit = 0b00000001
    let arr = game.arrows8.components(separatedBy: ",")
    
    for biDex in 0..<8 {
      i += 1
      let abl = Arrbel() /// i i i i i abl
      vw.addSubview(abl) /// s s s s s abl
      let biDigit
        = wiseBit << (biDex) & mask
      let num = NSNumber(value: biDigit)
      
      if num.boolValue {
        abl.text = arr[Int(i)]
      } else { abl.text = interpunct }
      abl.font = vw.sizedFont(.a8font)
      abl.sizeToFit()
      
      //      vw.addSubview(abl) /// s s s s s abl
      abl.textColor = .white
      // center at top of the view
      abl.center.x = vw.frame.width/2
      abl.center =
        abl.cpArrbelShifted(
          referenceView: vw,
          byDegrees: CGFloat(i * 45))
      
      res.append(abl) /// a a a a a a a a a a a a a abl
      //            print("biDigit", biDigit, "i", i, "biDex", biDex)
    }
    return res
  }}
internal
extension ChildVC {
  func updateArrowsFor(_ dyce:[Die]) {
    for d in dyce {
      if d.dillz.contains(dash) {
        print("SKIPax,dillz,ttr,tt", d.ax, d.dillz, d.ttr, d.tt)
        
        continue }
      
      updateArrowsForDi(d)
      update8arrbelsForDie(d)
      d.dir8str = stringFrom(labels: d.dir8bels)
      //            print(d.ax, "dir8str", d.dir8str)
    }}}
fileprivate extension ChildVC {
  func updateArrowsForDi(_ di: Die) {
    //        di.ttr = di.tt.toInt().toL()
    //        di.ax = Character(di.ttr)
     let game = gm
    
    di.dir8mask = 0b00000000
    for row in game.r5row {
      if !row.contains(di.ttr) { continue }
      di.r5row = row
      di.set_3_bit(row)
      di.set_7_bit(row)
    }
    for col in game.r5col {
      if !col.contains(di.ttr) { continue }
      di.r5col = col
      di.set_1_bit(col)
      di.set_5_bit(col)
    }}}
//fileprivate extension ViewController {
//  func update8arrbelsForDie(_ di: Die) {
//    assert(di.dir8mask < 256)
//    let wiseBit = 0b00000001
//    let arr
//      = arrows8.components(separatedBy: ",")
//    for (i,abl) in di.dir8bels.enumerated() {
//      let biDigit = (wiseBit << i & di.dir8mask)
//      if biDigit > 0 {
//        abl.text = arr[i]
//      } else { abl.text = interpunct }
////      abl.sizeToFit()
//    }}}
//fileprivate
extension Die {
  // can move right
  func set_3_bit(_ row: String) {
    //        print("s3bax,dillz,ttr,tt", ax, dillz, ttr, tt )
    
    let pos = row.indexInt1st(of: ax)
    let holeRight = row.indexIntLast(of: dash)
    assert(pos != nil)
    assert(r5row == row)
    if holeRight == nil { return }
    let move3ok = (pos! < holeRight! ? Int(b3t) : 0)
    dir8mask = dir8mask | move3ok
  } // can move left
  func set_7_bit(_ row: String) {
    let pos = row.indexInt1st(of: ax)
    let holeLeft = row.indexInt1st(of: dash)
    assert(pos != nil)
    assert(r5row == row)
    if holeLeft == nil { return }
    let move7ok = (pos! > holeLeft! ? Int(b7t) : 0)
    dir8mask = dir8mask | move7ok
  } // can move up
  func set_1_bit(_ col: String) {
    //        print("s1bax,dillz,ttr,tt", ax, dillz, ttr, tt )
    
    let pos = col.indexInt1st(of: ax)
    let holeDown = col.indexInt1st(of: dash)
    assert(pos != nil)
    assert(r5col == col)
    if holeDown == nil { return }
    let move1ok = (pos! > holeDown! ? Int(b1t) : 0)
    dir8mask = dir8mask | move1ok
  }// can move down
  func set_5_bit(_ col: String) {
    let pos = col.indexInt1st(of: ax)
    let holeUp = col.indexIntLast(of: dash)
    assert(pos != nil)
    assert(r5col == col)
    if holeUp == nil { return }
    let move5ok = (pos! < holeUp! ? Int(b5t) : 0)
    dir8mask = dir8mask | move5ok
  }}
extension Arrbel {
  func cpArrbelShifted(
    referenceView ref: UIView,
    byDegrees deg: CGFloat) -> CGPoint {
    let cp0i = self.center
    var pc: CGPoint = .zero // polarCenter
    var pe: CGPoint = .zero // polarEquivelent
    pc.x = ref.frame.width/2 //+ ref.frame.origin.x
    pc.y = ref.frame.height/2 //+ ref.frame.origin.y
    
    //        let x = UILabel()
    //        x.text = " x "
    //        x.sizeToFit()
    //        x.center = pc
    //        x.backgroundColor = .red
    //        self.superview?.addSubview(x)
    //        ref.superview?.addSubview(x)
    
    let dx = 0 + cp0i.x - pc.x
    let dy = 0 + cp0i.y - pc.y
    let r2 = dx*dx + dy*dy
    let r = CGFloat(sqrt(r2))
    let theta = atan2(dy, dx) * 180/CGFloat.pi
    
    let newTheta = theta + deg
    let newDY = r * newTheta.cgSine()
    let newDX = r * newTheta.cgCosine()
    pe.x = CGFloat(newDX) + pc.x
    pe.y = CGFloat(newDY) + pc.y
    return pe
  }}
fileprivate extension ChildVC {
  func update8arrbelsForDie0rig(_ di: Die, game: Game) {
    assert(di.dir8mask < 256)
    assert(di.superview != nil)
    let wiseBit = 0b00000001
    let arr = game.arrows8.components(
      separatedBy: ",")
    for (i,abl) in di.dir8bels.enumerated() {
      abl.frame.size = .zero
      abl.frame.origin = .zero
      abl.removeFromSuperview() /// r r r r
      abl.font = di.sizedFont(.a8font)
      let biDigit = (wiseBit << i & di.dir8mask)
      if biDigit > 0 {
        abl.text = arr[i]
        abl.textColor = .green
      } else {
        abl.text = interpunct
        abl.textColor = .clear
      }
      abl.sizeToFit()
      abl.center.y = 0
      abl.center.x = di.frame.width/2
      // center at the top
      
      
      abl.center =
        abl.cpArrbelShifted(
          referenceView: di,
          byDegrees: CGFloat(i * 45))
      
      di.addSubview(abl) /// s s s s s s abl
    }
  }}
fileprivate extension ChildVC {
  func update8arrbelsForDie(
    _ di: Die) {
    
     let game = gm
    
    assert(di.dir8mask < 256)
    assert(di.superview != nil)
    let wiseBit = 0b00000001
    let maxI = di.dir8bels.count
    let arr = game.arrows8.components(
      separatedBy: ",")
    for (i,abl) in di.dir8bels.enumerated() {
      abl.frame.size = .zero
      abl.frame.origin = .zero
      abl.removeFromSuperview() /// r r r r
      abl.font = di.sizedFont(.a8font)
      let biDigit = (wiseBit << i & di.dir8mask)
      
      var ai = i
      ai = i + Int((di.diAngle/ang4v_o))
      if ai < 0 { ai = 0 }
      if ai > maxI { ai = maxI }
      
      if biDigit > 0 {
        abl.text = arr[ai]
        abl.textColor = .green
      } else {
        abl.text = interpunct
        abl.textColor = .orange
      }
      abl.sizeToFit()
      abl.center.y = 0
      abl.center.x = di.frame.width/2
      // center at the top
      //        print("up8a diAng", di.angle)
      abl.center =
        abl.cpArrbelShifted(
          referenceView: di,
          byDegrees: CGFloat(i) * 45.0 + di.diAngle)
      
      if zck(.dbug) {
        di.addSubview(abl) /// s s s s s s abl
      }
    }
  }}
