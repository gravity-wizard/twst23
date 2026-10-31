//
//  button_hlp.swift
//  two4
//
//  Created by G on 10/13/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import UIKit

extension UIButton{
    func setImage(image: UIImage?,
                  inFrame frame: CGRect?,
                  forState state: UIControl.State) {
        self.setImage(image, for: state)
        
        if let frame = frame{
            self.imageEdgeInsets = UIEdgeInsets(
                top: frame.minY - self.frame.minY,
                left: frame.minX - self.frame.minX,
                bottom: self.frame.maxY - frame.maxY,
                right: self.frame.maxX - frame.maxX
            )
        }
    }
}
func printFontNames() {
    for family in UIFont.familyNames.sorted() {
        let names = UIFont.fontNames(forFamilyName: family)
        print("Family: \(family) Font names: \(names)")
    }
}
// https://stackoverflow.com/questions/18518222/how-can-i-concatenate-nsattributedstrings
// https://stackoverflow.com/questions/24666515/how-do-i-make-an-attributed-string-using-swift/32269975#32269975
// https://www.hackingwithswift.com/articles/113/nsattributedstring-by-example
extension String {
    func u5strike(thru: Bool) -> NSMutableAttributedString {
        
        let unSelf = self
        let sNum = thru as NSNumber
//        print("sNum",sNum)
        
        let nth = unSelf.count
//        let font = UIFont.systemFont(ofSize: 22)
        let attStruck: [NSAttributedString.Key: Any] = [
//            .font: font,
            .foregroundColor: UIColor.black,
        ]
        let struck = NSMutableAttributedString(string: unSelf, attributes: attStruck)
        struck.addAttribute(.strikethroughStyle, value: sNum, range: NSRange(location: nth/3, length: nth/3))
        struck.addAttribute(.strikethroughColor, value: UIColor.red, range: NSRange(location: nth/3, length: nth/3))
            
//        print("struck", struck)
        
        return struck
        
    }
}

enum FontBook: String {
    case u5strike       = "Avenir,70"
//        = "LIGHTSTRIKE, 70"
    case diceQ          = "Menlo-Regular, 077"
//  "Bangla Sangam MN, 62" // remains unique
    case bangla         = "Bangla Sangam MN,057" // yet does same
//    "TrajanPro-Regular"
//    case TrajanBold     = "Trajan-Bold"
//    case Trajan         = "TrajanPro-Regular"
//    case BriX_Invers    = "TrajanusBriX-Invers"
//    case bricks         = "TrajanusBricks, 57"
//    case BricksXtra     = "TrajanusBricksXtra"
    case m1roman        = "TrajanPro-Regular, 62"
    case m2roman        =  "TrajanPro-Regular, 57"
    case sayFont        = "CronosPro-Italic, 98"
    
    case legal          = "CronosPro-Italic,33"

    case regular        = "Avenir, 70"
    case popper         = "CronosPro-Italic,77"
    case hmMenu         =  "CronosPro-Italic, 77"
    case Banner         = "CronosPro-Italic"
//    case Banner2        = "CronosPro-Italic"
    case HeavyItalic    = "AvenirNext-HeavyItalic"
    case menlo          = "Menlo-Regular, 55"
    case a8font         = "Menlo-Regular, 24"
  
    case dinBold        = "DIN Alternate, 100"
    case dinCond        = "DIN Condensed, 70"
    case dinStat        = "DIN Alternate, 70"
    
    func of(size: CGFloat) -> UIFont {
        return UIFont(name: self.rawValue, size: size)!
  }
} /// font = sizedFont(.diceQ, prcnt: 0) size 0 for default
extension UIView {
  func sizedFont(_ fnt: FontBook,
                 prcnt: CGFloat = 0,
                 f:String=#function) -> UIFont {
    
//    print(f, "sf")
    assert(frame.height > 0)
    var p7 = prcnt
    //        var res:UIFont = .boldSystemFont(ofSize:24)
    let comps = fnt.rawValue.components(separatedBy: ",")
    //        print("fntComps", comps)
    assert(comps.count == 2)
    let cgf2 = comps.last?.toCGFloat()
    if p7 == 0 { p7 = cgf2! }
    
    let sz = p7/100 * frame.height
    return UIFont(name: comps.first!, size: sz)!
  }
}
// https://medium.com/@topLayoutGuide/swift-custom-fonts-slightly-less-awful-f235e20027f3
//This lone enum can hold all the fonts you will ever need to use in your application. You simply need to add cases for each font you want to use, give them the appropriate PostScript values, and invoke them like so:
//something.font = FontBook.Regular.of(1024)
extension UIButton {
    func toggleButton(_ sender: UIButton) {
        sender.isSelected = !sender.isSelected
    }
}

import SwiftUI

enum CenterID:
String, CaseIterable {
  case i = "CVinfo"
  case q = "CVgameQ"
  case x = "CVgameX"
  case s = "CVsetting"
}

//slide23 to run two games. One rectangular(Q) and one tophat(X)
extension UIButton {
  func txtSet(_ nutxt: String) -> Bool {
    let txtWas = titleLabel?.text
    
    setTitle(nutxt, for: [] )
    let didChange = txtWas == nutxt
    
    return didChange
    
  }
}
extension UIButton {
  func toggleBGclearOr(color: UIColor) {
    let now = backgroundColor
    backgroundColor = now == .clear ? color : .clear
  }
}
extension UIButton { // deciSeconds
  func dimOnTap(
    ds: Double = 1,
    u: String = #function) {
    // default is one tenth of a second
    gui(u + (self.titleLabel?.text ?? "noText"))

    let was = alpha
    alpha = was * 0.70
    // diCustomize prevents changes init fixed
    DispatchQueue.main.asyncAfter(deadline: .now() + ds * 0.100) {
      self.alpha = was
    }
  }
}

