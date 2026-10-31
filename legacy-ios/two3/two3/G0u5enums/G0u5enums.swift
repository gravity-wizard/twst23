//
//  G0u5enums2020.swift
//  two3
//
//  Created by G on 1/3/20.
//  Copyright © 2020 akapps. All rights reserved.
//

import UIKit
// useEnum toPeventDuplicates
public enum G0tag: Int, CaseIterable {
  case keep     = 115500
//  case stat     = 192001
//  case slat2    = 191202
  case slatView = 9221
  case xDone    = 240415
  case xCenter  = 240315
}
 /// tag = base + dex
public enum G0base: Int, CaseIterable {
  case aura       = 1000
  case cie        = 3900
  case die        = 4900
//  case grid       = 7180
  case grab       = 710000
  case menu       = 700000
  case statAny    = 9210
//  case statMove   = 1390
//  case statTime   = 2090
  case statView     = 9220
  case moveStatView = 3920
  case timeStatView = 2920
  
  case slatAny      = 9100
  case slatScore    = 9190
  
  case burger     = 2700
  case burgerTop  = 2720
  
  case setting    = 19500
  case xSeperate  = 2400
  case ySeperate  = 2500
  case edgeButton = 520000
  case edgeLabel  = 512000
  case edgeText   = 525000
  case imageView  = 92200
  case label      = 12200
  case slatView   = 9120
//  case gridAny
  case gridPositive    =  7180
  case gridNegative    = -7180
}
public var g0isPortraight: Bool? // = true
public let g0isPad = UIDevice.current.userInterfaceIdiom == .pad
public let g0isPhone = UIDevice.current.userInterfaceIdiom == .phone



