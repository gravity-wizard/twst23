//
//  resize_hlp.swift
//  two3
//
//  Created by G on 11/30/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import SwiftUI
// resize
class CenterView: PVCV {}
// PivotCenterView
class PVCV: Pivot {
  var rv: String?
}
extension VC {
  // n0t-BB means Burger at the Bottom n0t-bb
  enum MainMenuTitlesBB: String, CaseIterable {
//    case scoresBB    = " Scores "
    
    case settingsBB     = " Settings "
    
    case tutorial       = " Tutorial "
//    case rate_iTunes = " Rate us on iTunes \n\n We won't bug you"
    
    case contact_support = " Contact Support \n support@akapps.us "
    
//    case privacy_policy = " Privacy Policy \n akapps.us/privacy23 "
    
    case copyRightNotice = "©"
    
    static let allValues = MainMenuTitlesBB.allCases.map { $0.rawValue }
    // https://stackoverflow.com/questions/24007461/how-to-enumerate-an-enum-with-string-type
  }}
extension VC {
  // n0t-BT means Burger at the Top n0t-bt
  enum MenuTitlesTop: String, CaseIterable {
    case timeNow    = " - - - "
//    case timeBest   = " Best 800.0 "
    case movesNow   = " - - - - - "
//    case movesBest  = " Best 2345 "
    static let allValues = MenuTitlesTop.allCases.map { $0.rawValue }
    // https://stackoverflow.com/questions/24007461/how-to-enumerate-an-enum-with-string-type
  }}
//class ViewController: VC {
extension ViewController {
  func loadMenus(size: CGSize) {
    
    loadMenusBB()
    loadMenusTop()
    edgeButtonsArr = bsAddEdgeButtons()
    edgeLabelsArr = bsAddEdgeLabels()
    etvs = bsAddEdgeTextViews(2)
    view.eSeperateTextViews(arr: etvs)
  }
  fileprivate func loadMenusBB() {
    colorizeSlats()
    mainMenuSlat.removeFromSuperview()
    settingMenuSlat.removeFromSuperview()
    mainMenuSlat.tag = -191220201 // trigger rebuild
    settingMenuSlat.tag = -191220202
    vcSlatRetractSettings()
    retractMainMenu(unlock: true)
    vcSlatRetractTutorial()
  }
  fileprivate func loadMenusTop(
    u: String = #function) {
    let u2 = #function
    print(u2, u, g0scoreSlat?.tag as Any)
    slatColorize1bt()
//    g0scoreSlat?.tag = -191222001 // trigger rebuild
    
    vcSlatRetractTop(unlock: true)

    topBurger.isHidden = !disableSHUFFLE
//    simTopBurgerClick(nil)
  }
}



