//
//  global_23_hlp.swift
//  two3
//
//  Created by G on 11/29/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import SwiftUI

// globalSpaceDivisor
let gsd = 1.0/g0vFSM
var g0vFSM = g0sFSM
let g0sFSM:  CGFloat = 1.0
let g0sFSM_make4: CGFloat = 0.98
// n0t-fsm freeSpaceMultiplier

var p0rt: Bool? //viaAspectRatio
var g0mix = true
let g0wait = 1.00


// https://www.w3schools.com/charsets/tryit.asp?deci=8594&ent=rarr
let t0t = "t0t" // was ""
let z0z = "z0z" // to set zeroStates

/// Global initialize
internal struct Ginns {
    // notification name staticString
    
    static let nnTicQ = "nn_ticQgi"
    static let nnTicX = "nn_ticXgi"
    
//    static let nnUndone = "nn_undone"
    static let nnRedoneONE = "nn_redoneONE"
    static let nnRedoneALL = "nn_redoneALL"
}
internal struct Gitss {
    // timer static strings
    static let isTimrOnQ: Bool   = false
    
  static let gcInterval0: Double = 0.10 // increment
    static let gcInterval = gcInterval0
  static let gcDuration: Double = 0.10 // 1dg
    // globalClock
}

let nayUp       = Character("⬆️")
let nayDown     = Character("⬇️")
let nayLeft     = Character("⬅️")
let nayHorz     = Character("♓")
let nayVert     = Character("♈")
let nayRight    = Character("➡️")
let interpunct = "·"
let dash = Character("_")
//let arrows8 = "↑,↗,→,↘,↓,↙,←,↖"

func getFreeSpaceMultFor(dvc: D3VIC3) -> CGFloat {
  switch dvc {
    case .macOSX:   return CGFloat(0.62)
    case .iPhone:   return CGFloat(0.96)//0.90
    case .wtchOS:  return CGFloat(0.23)
    case .unknown:  return CGFloat(0-9)
    case .iPad:   return CGFloat(0.90)
  }
}

//MARK: ScaleFactors
// 0.94 & 0.80 for 1x2
let grsf0   = 0.96  // onlyPosSpace
let grsf1   = 0.90 // negSpaceToo
var grsf    = grsf0
let cisf    = 0.98 // 0.97
let arsf    = 0.98
let disf    = 0.96 // 0.88 //0.96
// gridSwellFactor
let gridSwFct: CGFloat = 1.00

let zdelta = 10
let intMeansRepeat = 11
// set to 11 for repeat
let waitTime: Double = .pi/10

var sectRect: CGFloat = 6.00
let numberOfSectors: CGFloat = 8.00
let ang00_o = 360 * sectRect / numberOfSectors
let ang4v_o =
  360 * (sectRect + 1)/numberOfSectors
let dsp: Double = 12 // raise to speedup 20 4norma0


let msb  = UIScreen.main.bounds
let msnb = UIScreen.main.nativeBounds
let msw  = msb.width
let msh  = msb.height
let msnw = msnb.width // n = native
let msnh = msnb.height

let msmind = min(msw, msh) // mainScreenMinimumDimension
let msmaxd = max(msw, msh) // mainScreenMaximumDimension
//let mscx = msw/2.0, mscy = msh/2.0 // centers
let mscx = msmind/2.0, mscy = msmaxd/2.0 // centers
let mscp = CGPoint(x:mscx, y:mscy) // mainScreeCenterPoint

//let nar = (320.0/568.0)/(msw/msh)
let nar = (414.0/896.0)/(msw/msh) // normalizedAspectRatio is1.0 for iPhone

let wrd = " wrd_weird_nil " // if superview is nil
let nilSpr = UIView(frame: CGRect(x: 11, y: 33, width: 55, height: 77))
let cg1 = CGFloat(1)


enum M0DLookCi {
    case ciNeg0i
    case ciNeg4v
    case ciPos0i
    case ciPos4v
    case ciSel
//    case unSel
}
enum M0DLookDi {
    case diNeg0i
    case diNeg4v
    case diPos0i
    case diPos4v
    case diSel
}

enum M0DLookGm {
    case gmP0nly // pos0nly
    case gmBoth1 // bothPolaritiesOfSpace
}
enum M0DHomeWhere: String, CaseIterable {
    case dontHome       = "X"
    case enPositive     = "p"
    case enNegative     = "n"
    static let allValues
        = M0DHomeWhere.allCases.map { $0.rawValue }
}

enum U5set: String, CaseIterable  {
    case u5sound   = "sound effects"
    //    case u5voicePrompts   = "voice prompts"
    case u5color    = "light colors"
    case u5spin     = "apply spin"
    case u5mask     = "apply mask"
    case u5twGrid   = "polar shift"
    case u5twCice   = "twist cice"
    case u5twDice   = "twist dice"
    static let u5sets = U5set.allCases.map { $0.rawValue }
    // https://stackoverflow.com/questions/24007461/how-to-enumerate-an-enum-with-string-type
}
//var MASK: String?
let keep24 = ""
    + "__,__,ca,da,__,__,"
    + "__,bb,cb,db,eb,__,"
    + "ac,bc,cc,dc,ec,fc,"
    + "ad,bd,cd,dd,ed,fd,"
    + "__,be,ce,de,ee,__,"
    + "__,__,cf,df,__,__ "

//var mask24  = U5set.u5mask.rawValue.u5read()
//var spin24  = U5set.u5spin.rawValue.u5read()
//var twCice24 = U5set.u5twCice.rawValue.u5read()
//var twGrid24 = U5set.u5twGrid.rawValue.u5read()


//var sound5u = U5set.u5sound.rawValue.u5readBool()
//var color5u = U5set.u5color.rawValue.u5readBool()

var u5vLightColors = U5set.u5color.rawValue.u5readBool()


//var twDice24 = U5set.u5twCice.rawValue.u5read()

var ebXmodeBool:    Bool?

//var ebRottDiceBool: Bool?
var ebRottNegBool = false
//var ebRottPosBool:  Bool?

var ebNumWideInt:   Int?
var ebNumHighInt:   Int?

var ebPosGmBool:      Bool?
var ebPosOnlyM0D =   M0DLookGm.gmP0nly

var ebHomeString:   String?
var ebHomeWhereM0D = M0DHomeWhere.enNegative

var isMode24: Bool?
