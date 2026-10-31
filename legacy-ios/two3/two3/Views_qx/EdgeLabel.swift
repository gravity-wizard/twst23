//
//  EdgeLabel.swift
//  two4
//
//  Created by G on 10/18/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import SwiftUI

class EdgeLabel: UILabel {
  var dex = 0-1
  var egLbName: EgLbName?
  convenience init(name: EgLbName) {
    self.init()
    egLbName = name
    let rv = egLbName?.rawValue
    edgeLabelStyle(txt: rv!)
  }
  override init(frame: CGRect) {
    super.init(frame: frame)
  }
  required init?(coder: NSCoder) {
    fatalError("egabe wrdimp")
  }
  func edgeLabelStyle(txt: String) {
    text = txt
    textColor = .yellow
    font = UIFont(name: "Menlo-Regular", size: fnt.szEL)
    //        lineBreakMode = .byWordWrapping
    numberOfLines = 0
    sizeToFit()
    //        retweak(8) must have superview
    
    // You can use \r to go to next line
    //        while filling up the UILabel using NSString.
    //        label.text = [NSString stringWithFormat:@"%@ \r %@",
    //        @"first line",@"seconcd line"];
  }
}
enum EgLbName: String, CaseIterable {
  case rows = "rows_plcholder"
  case cols = "cols_plcholder"
}
extension VC {
  func bsAddEdgeLabels() -> [EdgeLabel] {
    
    var arr: [EdgeLabel] = []
    
    for name in EgLbName.allCases {
      let abe = EdgeLabel(name: name) /// eb
      arr.append(abe) /// ++++ eb
    }
    assert(arr.count > 0)
    view.ySeperateViews(arr)
    view.xSeperateLabels(arr)
    if zck(.dbug) {
      self.view.addSubviews(arr)
      self.addRightEdgeLabels(arr)
    }
    return arr
  }
}
extension UIView {
  func xSeperateLabels(_ arr: [EdgeLabel]) {
    var cgi: CGFloat = 0
    var gnt = CGFloat(arr.count) + 1
    gnt = 1 // for leftEdgeLabels
    let xgap = frame.size.width/gnt
    
    for lbl in arr {
      lbl.tag = Int(cgi) + G0base.xSeperate.rawValue
      assert(lbl.setTagCG(i: cgi))
      cgi += 1 //  * i
      lbl.text! += "\n →← \n" + String(lbl.tag)
      lbl.sizeToFit()
      lbl.center.x = xgap
      // reverse halfWidth ofLabel
      lbl.center.x -= lbl.frame.width/2
      //            lbl.psVWa([.all])
    }}}
extension VC {
  func eglb(
    _ nm: EgLbName,
    u: String = #function) -> EdgeLabel {
//    gui(#function + u + nm.rawValue + x0t + tfx )
    
   
    if (skpEdgAbe == 1) { return EdgeLabel()  }
    
    
    assert(edgeLabelsArr.count > 0)
    var res:EdgeLabel?
    let scomps = nm.rawValue.components(
      separatedBy: "_")
    let s = String(scomps.first!)
    for el in edgeLabelsArr {
      let elnm = String(el.egLbName.debugDescription)
      if elnm.contains(s) { res = el}
    }
    return res!
  }}
//extension ViewController {
//func readRegions() {
//    eglb(.rows).text = "rows \n1234 \n2341 \n3421"
//    eglb(.rows).sizeToFit()
//}}
