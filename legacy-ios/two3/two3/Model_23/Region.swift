//
//  Region.swift
//  two4
//
//  Created by G on 10/19/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import UIKit

class RLb: UILabel {} // RegionLabel
class Row: RLb {}
class Col: RLb {}
class Box: RLb {}

extension ChildVC {
  func readRegionsIn(
    _ cyce: [Cie],
//    game: Game,
    u: String = #function) {
    
    gui(#function + u + gm.gameName + x0t)
    readRowsIn(cyce)
    readColsIn(cyce)
    }
  func readRowsIn(_ cyce: [Cie]) {
     let game = gm
    
        game.r5row = []
        // rowNumber
        for n in 1...game.ecVertical {
            var txt = ""
            for c in cyce {
                if c.cirow != n { continue }
                var l = c.ciax
                if c.ciax == dash { l = dash }
//                print("tts,l,ciax", c.tts, l, c.ciax)
                txt += String(l)
            }
            print("rr", n, txt)
            game.r5row.append(txt)
        }
        print("game.r5row", game.r5row)
        eglb(.rows).numberOfLines = game.r5row.count + 1
        eglb(.rows).text = "rows"
        for row in game.r5row {
            eglb(.rows).text? += "\n" + row
        }
        
        eglb(.rows).retweak(5)
    }}
extension ChildVC {
  func readColsIn(_ cyce: [Cie]) {
    
     let game = gm
    
    game.r5col = []
    // colNumber
    for n in 1...game.ecHorizontal {
        var txt = ""
        for c in cyce {
            if c.cicol != n { continue }
            var l = c.ciax
            if c.ciax == dash { l = dash }
//            print("tts,l,ciax", c.tts, l, c.ciax)
            txt += String(l)
        }
//        print("rc", n, txt)
        game.r5col.append(txt)
    }
    eglb(.cols).numberOfLines = game.r5col.count + 1
    eglb(.cols).text = "cols"
    for col in game.r5col {
        eglb(.cols).text? += "\n" + col
    }
//    eglb(.cols).retweak(5)
}}
extension UILabel {
    func retweak(_ by:CGFloat, f:String=#function) {
        if superview == nil { return }
        print("tweak",f,tag)
        sizeToFit() // rightEdgeTweak
        let bo = frame.width/2 + by*by// backOff
        center.x = (superview!).frame.width - bo
    }}
extension VC {
    func addRightEdgeLabels(_ arr :[UILabel]) {
        for lbl in arr {
            view.addSubview(lbl)
            lbl.retweak(3)
        }
    }
}
