//
//  letters24hlp.swift
//  two4
//
//  Created by G on 10/13/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import UIKit

let nar1 = CGFloat(1).narCGFreturn(00+01)
let dnar1 = 1/nar1 // ds are divide modifiers

struct FontSize {
  static var digits: CGFloat = 20.int__narCGF(0.5)
  static let leader: CGFloat = 18.int__narCGF(0.5)
  static let tutorial  = leader * 1.20
  static let u5setting = leader * 0.80
}
struct fnt {
    static let szX : CGFloat = 20.int__narCGF(0.5)
    static let szEB: CGFloat = 12/dnar1 // edgeButtons
    static let szEL: CGFloat = szEB/1.1     // edgeLabels
    static let szET: CGFloat = szEB/1.1     // edgeTextViews
    static var szSB: CGFloat = 18/dnar1 // scoreBoard
    static let szCI: CGFloat = 8/dnar1 // Cice
    static let szDI: CGFloat = 24/dnar1 // Dice
    static let szMMfine:   CGFloat = 20/dnar1 // MainMenu
    static let szMMnormal: CGFloat = 24/dnar1 // MainMenu
}

func llzFrom(xyz: [Int]) -> String {
    
    assert(xyz.count == 3)
    let xi = xyz[0]
    let yi = xyz[1]
    let zi = xyz[2]
    let xl = xi.toL()
    let yl = yi.toL()
    let zl = zi.toL()
    
//    return xl + yl + zl
    return yl + xl + zl
}
extension //MARK: toCHARACTER ASCII_FUNCTIONS
Int {
    func to1cchar32() -> CChar32 {
    return CChar32(UnicodeScalar(self + 96)!)
    }
    func to1CCHar32() -> CChar32 {
        return CChar32(UnicodeScalar(self + 64)!)
    }
    func to1STRing() -> String {
        var output = String()
        for power in (0...16).reversed() {
            let digit = self / Int(pow(10, Double(power)))
            
            if digit == 0 { continue }
            output.append(String((digit % 10).to1CCHar32()))
        }
        return output
    }
    func to1string() -> String {
        var output = String()
        for power in (0...16).reversed() {
            let digit = self / Int(pow(10, Double(power)))
            
            if digit == 0 { continue }
            let char = (digit % 10).to1cchar32()
            output.append(String(char))
        }
        return output
    }
    func toL() -> String {
        return String(self.intToChar()).uppercased()
    }
    func intToChar() -> Character {
        let up1 = 0
        // Convert Int to a UnicodeScalar.
        let u = UnicodeScalar(self+96+up1)
        // Convert UnicodeScalar to a Character.
        let char = Character(u!)
        return char
    }
    func intToCHAR() -> Character {
        let up1 = 0
        // Convert Int to a UnicodeScalar.
        let U = UnicodeScalar(self+64+up1)
        // Convert UnicodeScalar to a Character.
        let CHAR = Character(U!)
        return CHAR
    }
}

extension String {
    func txt() -> String {  // for appending file extensions
        return self + ".txt"
    }
    func toCGFloat() -> CGFloat {
        let int =
            self.toInt()
        return CGFloat(int)
    }
    func toInt() -> Int {
        return Int(self.toInt32())
    }
    func toInt32() -> Int32 {
        
        let self7 = self.lowercased()
        
        let int32 = self7._bridgeToObjectiveC().intValue
        
//        print("to32", self, self7, int32)
        
        return int32
    }
}
extension Character {
    func charToInt() -> Int {
        return String(self).toInt()
    }
   func intFromAX() -> Int {
        
        
        var cs = UInt32(65) // caseSetter
        cs -= 26 * 0 // 1 for lower case

        let num = Array(self.unicodeScalars)[0].value - cs
        
        return Int(num)
        
    }
}
extension String {
    func axFromLLz(wide: Int) -> Character {
        
        var cs = UInt32(65) // caseSetter
        cs -= 26 * 0 // 1 for lower case

        let col = Array(self.unicodeScalars)[1].value - cs
        let row = Array(self.unicodeScalars)[0].value - cs
        
        let num = row * UInt32(wide) + col + cs
        let char = Character(UnicodeScalar(num)!)
//        print("axfllz", wide, self, col, row, num, char)
        
        return char
    }
}
extension Int {
    func axFromDex() -> Character {
      
      let ax = "ax"
      let aVal = Int(Array(
        ax.unicodeScalars)[0].value)
//      let xVal = Int(Array(
//        AX.unicodeScalars)[1].value)
//      let num = xVal - self
      let num = aVal + self
      let char = Character(UnicodeScalar(num)!)
//        print("axfdex", self, num, char)
        
        return char
    }
}
var axDict:[Character: Character] =
    [
            "a":"A", "c":"B", "g":"C",
        "b":"D", "d":"E", "h":"F", "m":"G",
            "e":"H", "i":"I", "n":"J",
        "f":"K", "j":"L", "o":"M", "s":"N",
            "k":"O", "p":"P", "t":"Q",
         "l":"R", "q":"S", "u":"T", "w":"U",
            "r":"V", "v":"W", "x":"X"
]

func valsFrom_ax(_ dict: Dictionary<Character,
    Character>) -> String {
    
    var keys = ""
    var vals = ""
    
    for n in 0..<24 {
        let key = n.axFromDex()
        let val = dict[key]
        keys.append(key)
        vals.append(val!)
//        print("sfaxd", n,key,val!)
    }
//    print("sfaxd", keys, vals)
//    print("axDict", axDict)
    
    return vals
    
}
extension String {
    func replaceVia(_ dict: Dictionary<Character,
        Character>) -> String {
        
        var res = ""
        
        for char in self {
            for e in dict {
                if e.value != char { continue }
                res.append(e.key)
//                print("res", res)
            }
        }
        return res
    }
}
func stringFrom(labels: [UILabel]) -> String {
    var res = ""
    for l in labels {
        res.append(l.text!)
    }
    return res
}
extension ChildVC {
    func dir8matching(die: Die) -> [Die] {
        
        var res: [Die] = []
        
        for d in dice {
            if d.dir8str != die.dir8str {continue}
//            d.ara.backgroundColor = .green
            res.append(d)
        }
        return res
    }
}
