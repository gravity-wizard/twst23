////
////  slatViewBB.swift
////  QXicz
////
////  Created by G on 9/22/19.
////  Copyright © 2019 sdxAGS. All rights reserved.
////
//
import UIKit

//let g0SxDone = "Done  "
// n0t-g0s means GLOBALstatic
// n0t-g0v means GLOBALvarible
enum DoneText: String {
  case done = "Done  "
  case hide = "Hide  "
}
extension UIView {
  // n0t-nil means setMagenta if background color is nil
  func xButton(text: DoneText,
               color: UIColor? = nil,
               u: String = #function) -> UIButton {
    let x = UIButton()
    x.setTitle(text.rawValue, for: .normal)
    x.alpha = g0sAlphaSlats
        x.titleLabel?.font = UIFont.systemFont(ofSize: fnt.szX * 1.2)
    x.sizeToFit()
        x.titleLabel?.font = UIFont.systemFont(ofSize: fnt.szX * 1.0)
    
    self.addSubview(x)  // n0t-autoColor
    let textColor7 = auto(color: color)
    // n0t-7 means varible as v resembles 7
    x.setTitleColor(textColor7, for: .normal)
    x.frame.origin.x = self.frame.width - x.frame.size.width
    
    for sv in subviews {
      if sv.tag != 24 { continue }
      sv.removeFromSuperview()
    }
    x.tag = 24
    return x
  }
}

extension ViewController {
  func slatMakeMainMenu() { // h > 2.2 for middle deploy
    mainMenuSlat = view.fractionalMenuSlat(
      width: slatWidth1bb, height: slatHeight1bb)
    grab1bb.frame.size = CGSize(width: burgerHeight, height: burgerHeight)
    
    slatColorizeMain()
    let x = mainMenuSlat.xButton(text:.done)
    x.addTarget(self, action: #selector(
      xButtonClicked(sndr: )), for: .touchUpInside)
    
    grab1bb.frame.origin.y =
      view.frame.height - grab1bb.frame.size.height
    
    
    self.mainMenuSlat.frame.origin.y =
      self.view.frame.maxY - self.grab1bb.frame.height
    self.mainMenuSlat.center.x =
      0 - self.mainMenuSlat.frame.width/2 + self.grab1bb.frame.width
    
    grab1bb.addTarget(self, action: #selector( /// =================>
      grabButtonClicked1bb(sndr: )), for: .touchUpInside)
    
    let numberOfPopButtons = populateMenus1bb()
    grab1bb.hamburger(quant: numberOfPopButtons)
    
      view.addSubview(mainMenuSlat)
      view.addSubview(grab1bb)
  }
  func slatColorizeMain() {
    mainMenuSlat.backgroundColor = CCBLU.bluemdm.__uiColor()
    
    for sv in mainMenuSlat.subviews {
      if sv is UIButton {
        if (sv as! UIButton).titleLabel!.text!.contains("©") {
          (sv as! UIButton).twoLinesAppInfo()
        }
      }
    }
  }
  func slatColorizeSettings() {
    settingMenuSlat.backgroundColor = CCBLU.beige.__complemetary()
    
    for sv in settingMenuSlat.subviews {
      
      if sv is UIButton {
        if sv is U5erButton {
          (sv as! U5erButton).u5reset()
        }}
    }
  }}

extension UIButton {
  func forkMainMenu(_ items: [VC.MainMenuTitlesBB]) -> VC.MainMenuTitlesBB? {
    for item in items {
      if item.rawValue == titleLabel?.text { return item }
    }; return nil
  }}
extension ViewController { @objc func popButtonClicked(sndr:UIButton) {
  
  let forked = sndr.forkMainMenu(MainMenuTitlesBB.allCases)
  
  for _ in MainMenuTitlesBB.allCases { // make exhaustive
    
    switch forked {
      
      case .settingsBB: slatExtendSettings()
      
      case .tutorial:   slatExtendTutorial()
      case
      .contact_support: supportAction(sender: sndr)
      case .none: break
      case .some(.copyRightNotice): break
      
    }}
  }
  func tutorialAction() {}
  func slatExtendTutorial() {
    
    if tutorialViewSlat.tag < 1 { slatMakeTutorial() }
    
    retractMainMenu(unlock: true)
    
    tutorialViewSlat.isHidden = false
    tutorialViewSlat.superview?.bringSubviewToFront(tutorialViewSlat)
    UIView.animate(withDuration: 0.3, delay:0.05, animations: {
      
      self.tutorialViewSlat.center = self.view.center
      //      abe.center = self.tutorialViewSlat.center
      
    }, completion: { finished in
      
    })
  }
  func slatMakeTutorial() { // h > 2.2 for middle deploy
    //    let adjetive = Bool.random() ? "ultimate" : "maximum"
    for sv in tutorialViewSlat.subviews {
      sv.removeFromSuperview()
    }
    
    let x = tutorialViewSlat.xButton(text:.done)
    x.addTarget(self, action: #selector(
      xButtonClicked(sndr: )), for: .touchUpInside)
    x.alpha = 1.0
    
    let textAbove: String =
    "Observe the number sequence, then click "
    
    let textBelow: String =
    "When the mixing is complete, the clock will start. " +
    "Tap the numbers to restore them to their proper order. " +
    "Choose the twisted™ puzzle, to put your mad skills to " +
    "the " + (Bool.random() ? "ultimate" : "maximum") + " test!"
    

    tutorialViewSlat.frame = view.frame
//    tutorialViewSlat.center.y *= -1.0; tutorialViewSlat.isHidden = true
    tutorialViewSlat.strechCustomWood(.wgpsd_541099, cornered: 0.0)
    

    let page = UIView()
    //    page.backgroundColor = .orange
    tutorialViewSlat.addSubview(page)
    page.frame.size.width  = min(MSW, MSH) * 0.90
    page.frame.size.height = min(MSW, MSH) * 0.90
    
    page.center = tutorialViewSlat.center
    
    let labelAbove = UILabel()
    //    labelAbove.backgroundColor = .cyan
    tutorialViewSlat.addSubview(labelAbove)
    
    labelAbove.frame.size.width  = page.frame.width  * 0.70
    //    labelAbove.frame.size.height = page.frame.height * 0.25
    
    labelAbove.numberOfLines = 0
    labelAbove.lineBreakMode = .byWordWrapping
    labelAbove.textColor = CCBLU.beige.__uiColor()
    labelAbove.font = UIFont.monospacedDigitSystemFont(
      ofSize: 0.85 * FontSize.tutorial,
      weight: UIFont.Weight.bold)
    
    
    labelAbove.text = textAbove
    labelAbove.textColor = labelAbove.auto(color: nil)
    
    
//    labelAbove.frame.origin.y =
//      page.frame.origin.y + page.frame.height * 0.20
//    labelAbove.center.x = tutorialViewSlat.center.x
    labelAbove.sizeToFit()
    
    let abe = UILabel()
    //    abe.numberOfLines = 0
    //    abe.lineBreakMode = .byWordWrapping
    abe.textColor = CCBLU.beige.__uiColor()
    abe.font = UIFont.monospacedDigitSystemFont(
      ofSize: 2.50 * FontSize.tutorial,
      weight: UIFont.Weight.bold)
    
    tutorialViewSlat.addSubview(abe)
    abe.textColor = abe.auto(color: nil) // make white too
    let str = "Shuffle " + g0sGappedCircle
    let att = NSMutableAttributedString(string: str)
    
    att.addAttribute(NSAttributedString.Key.font,
                     value:UIFont.monospacedDigitSystemFont(
                      ofSize: 1.50 * FontSize.tutorial, weight: .regular),
                     range:NSMakeRange(0, 8))
    
    abe.text = str
    abe.attributedText = att
    
    abe.sizeToFit()
    abe.center.x = tutorialViewSlat.center.x
    abe.center.y = tutorialViewSlat.center.y * 0.80
    
    let labelBelow = UILabel()
    //        labelBelow.backgroundColor = .cyan
    tutorialViewSlat.addSubview(labelBelow)
    
    labelBelow.frame.size.width  = page.frame.width  * 0.85
    //    labelAbove.frame.size.height = page.frame.height * 0.25
    
    labelBelow.numberOfLines = 0
    labelBelow.lineBreakMode = .byWordWrapping
    labelBelow.textColor = CCBLU.beige.__uiColor()
    labelBelow.font = UIFont.monospacedDigitSystemFont(
      ofSize: 0.85 * FontSize.tutorial,
      weight: UIFont.Weight.bold)
    
    
    labelBelow.text = textBelow
    labelBelow.textColor = labelBelow.auto(color: nil)
    
    labelBelow.sizeToFit()
    labelBelow.frame.origin.y =
      abe.center.y + abe.frame.size.height * 1.0
    labelBelow.center.x = tutorialViewSlat.center.x
    
    labelAbove.sizeToFit()
    labelAbove.frame.origin.y =
      abe.center.y - abe.frame.size.height * 1.0
    labelAbove.center.x = tutorialViewSlat.center.x
    
    tutorialViewSlat.tag = -20212319 // rebuild
    view.addSubview(tutorialViewSlat)
    tutorialViewSlat.center.y *= -1.0; tutorialViewSlat.isHidden = true
    
  }
  func vcSlatRetractTutorial() {
    if tutorialViewSlat.tag < 1 { slatMakeTutorial() }
    UIView.animate(withDuration: 0.3, delay:0.05, animations: {
      
      self.tutorialViewSlat.center.y *= -1.0
      
    }, completion: { finished in
      
      self.tutorialViewSlat.isHidden = true
      
    })
  }
  
  func supportAction(sender: AnyObject) {
    gui(sender.titleLabel!.text!)
    
    let title = sender.titleLabel!.text!
    
    let comps = title.components(separatedBy: "\n")
    let line2 = comps[1]
    let recipient = line2
    
    var message: String = "<br><br><br><br><br><br><br>"
    message += "<br> Model: "       + UIDevice.current.localizedModel
    message += "<br> Dimensions: "  + self.view.frame.size.debugDescription
    
    sendEmail(recipients: [recipient], message: message)
    
  }
  fileprivate func mmDemo0q() {
    retractMainMenu(unlock: false)
    //        lockUserInterfaceQ()
  }}
extension ViewController {
  @objc func u5setButtonClicked(sndr: U5erButton) {
    
    gui(sndr.title(for: [])!)
    
    sndr.u5toggle()
    if sndr.titleLabel!.text == U5EnumTitleBB.u5lightColors.rawValue {
      
      u5vLightColors = sndr.u5isOn
      gui(sndr.u5isOn.description)
      
      for child in childArr {
        for d in child.dice {
          d.diCustomize()
        }
      }
//      colorizeSlats()
    }
  }
  func colorizeSlats() {
    slatColorizeMain()
    slatColorizeSettings()
  }
}

extension ViewController {
  @objc func grabButtonClicked1bb(sndr:UIButton) {
    
    
    slatExtendMain()
    //lockUserInterface()
  }
  
  func slatExtendMain() {
    if mainMenuSlat.tag < 1 { slatMakeMainMenu() }
    assert(mainMenuSlat.frame != .zero)
    assert(mainMenuSlat.superview == view)
    let frac =
      mainMenuSlat.frame.height
        / view.frame.height
    print("frac",frac)
    let targetY = view.center.y
    
    
    mainMenuSlat.isHidden = false
    
    mainMenuSlat.superview?.bringSubviewToFront(mainMenuSlat)
    UIView.animate(withDuration: 0.3, delay:0.05, animations: {
      
      if frac < 0.4999 {
        self.mainMenuSlat.frame.origin.y = targetY // top to center
      } else { self.mainMenuSlat.center.y = targetY } // center to center
      
      //            self.grab1q.alpha = 0
      //            self.sayLabel.alpha = 0 // fadeout
      //            self.slat1q.alpha = alpq.slatalp
      self.mainMenuSlat.center.x = 0 + self.mainMenuSlat.frame.width/2
      
    }, completion: { finished in
      self.mainMenuSlat.unlockUIvw()
    })
  }
  
  func slatMakeSettings() { // h > 2.2 for middle deploy
    
    if mainMenuSlat.tag < 1 { print("wrd1q", mainMenuSlat.tag)
      slatMakeMainMenu()
    }
    assert(mainMenuSlat.frame != CGRect.zero)
    settingMenuSlat = view.fractionalMenuSlat(width: 4.0, height: 2.5)
    settingMenuSlat.frame = mainMenuSlat.frame /// frame from 2q
    
    slatColorizeSettings()
    _ = populateMenusSettings()
    let x = settingMenuSlat.xButton(text:.done)
    x.addTarget(self, action: #selector(
      xButtonClicked(sndr: )), for: .touchUpInside)
    
    view.addSubview(settingMenuSlat)
    
  }
  
  func slatExtendSettings() {
    if settingMenuSlat.tag < 1 { slatMakeSettings() }
    
    
    settingMenuSlat.isHidden = false
    
    settingMenuSlat.superview?.bringSubviewToFront(settingMenuSlat)
    UIView.animate(withDuration: 0.3, delay:0.05, animations: {
      
      //      self.settingMenuSlat.alpha = 1.0
      //      self.settingMenuSlat.bgc(.yellow)
      self.settingMenuSlat.center = self.mainMenuSlat.center
      
    }, completion: { finished in
      self.settingMenuSlat.unlockUIvw()
    })
  }
  func retractMainMenu(unlock: Bool, f: String = #function) {
    
    print("ret1q lockQ", f, unlock)
    
    if mainMenuSlat.tag == 0 { slatMakeMainMenu() }
    
    UIView.animate(withDuration: 0.3, delay:0.05, animations: {
      
      self.mainMenuSlat.frame.origin.y =
        self.view.frame.maxY // - self.grab1q.frame.height
      self.mainMenuSlat.center.x =
        0 - self.mainMenuSlat.frame.width/2 // + self.grab1q.frame.width
      
    }, completion: { finished in
      
      self.mainMenuSlat.isHidden = true
      //            if unlock {
      //                self.unlockUserInterfaceQ()
      //            }
    })
  }
  func vcSlatRetractSettings() {
    if settingMenuSlat.tag < 1 { slatMakeSettings() }
    //        isGrabbed2q = false
    
    
    UIView.animate(withDuration: 0.3, delay:0.05, animations: {
      
      //            self.slat2q.alpha = alpq.slatalp
      self.settingMenuSlat.center.x =
        0 - self.settingMenuSlat.frame.width/2 // + self.grabQ.frame.width
      
    }, completion: { finished in
      
      self.settingMenuSlat.isHidden = true
      
    })
  }
}
//
extension UIView {
  func fractionalScoreSlat(
    width: CGFloat,
    height: CGFloat,
    u: String = #function) -> ScoreSlat { let u2 = #function
    print(u2, width, height, u, self.tag)
    assert(width > 0.1)
    assert(height > 0.1)
    
    var slatWidth = frame.width / width
    var slatHeight = frame.height / height
    
    if width > 16 { slatWidth = width } // 1/16 minimum fraction
    if height > 16 { slatHeight = height } // else make pizel size
    
    let slatRect = CGRect(
      x:0, y:0, width: slatWidth, height: slatHeight)
    
    let slat = ScoreSlat(title: " 23 Puzzle", times: [0,0], moves: [0,0])
    slat.frame = slatRect
    slat.tag = 61919
    
    slat.isHidden = true
    
    //    slat.narVWmutate(1) // wider 4iPad
    //    slat.isUserInteractionEnabled = true critical_for_label
    return slat
  }
  
  // set width = w if > 16
  func fractionalMenuSlat(width: CGFloat, height: CGFloat) -> MenuSlat {
    assert(width > 0.1)
    assert(height > 0.1)
    
    var slatWidth = frame.width / width
    var slatHeight = frame.height / height
    
    if width > 16 { slatWidth = width } // 1/16 minimum fraction
    if height > 16 { slatHeight = height } // else make pizel size
    
    let slatRect = CGRect(
      x:0, y:0, width: slatWidth, height: slatHeight)
    
    let slat = MenuSlat(frame: slatRect)
    slat.tag = 619
    
    slat.isHidden = true
    
    //    slat.narVWmutate(1) // wider 4iPad
    //    slat.isUserInteractionEnabled = true critical_for_label
    return slat
  }
  //  func menu(texts: [String]) {}
}
extension UIView {
  func buttonSubviews() -> [UIButton] {
    var arr:[UIButton] = []
    for sv in subviews {
      if sv.tag == 24 { continue } /// Xbutton
      if sv is UIButton {arr.append(sv as! UIButton)}
    }
    return arr
  }
  func u5buttonSubviews() -> [U5erButton] {
    var arr:[U5erButton] = []
    for sv in subviews {
      if sv is U5erButton {arr.append(sv as! U5erButton)}
    }
    return arr
  }
  
  //  fileprivate
  func buttonsArrangeChecking(base: G0base) {
    var i:CGFloat = 0
    assert(frame != .zero)
    let btns = buttonSubviews()
    let quant = CGFloat(btns.count)
    let heightUsed = frame.height * 0.57
    let drop:CGFloat = 2.0 - 0.2
    let topMargin = (frame.height - heightUsed) / drop
    // set drop less than 2.0 to lower the buttons
    let cx = frame.width/2
    
    for b in btns {
      i += 1
      let cy = heightUsed
        * i/quant
        + topMargin
      
      b.center = CGPoint(x: cx, y: cy)
      //            print("istg",b.tag, "cktg",baseTag + Int(i))
      assert(b.tag == base.rawValue + Int(i))
      assert(b.frame != .zero)
      b.sizeToFit() // FIXME: sizeToFit formattedText nogo
    }
  }}

func stripFileExtension( _ filename: String ) -> String {
  var components = filename.components(separatedBy: ".")
  guard components.count > 1 else { return filename }
  components.removeLast()
  return components.joined(separator: ".")
}
func nameOfApp ( ) -> String {
  let bundle = Bundle.main
  if let name =  bundle.object(forInfoDictionaryKey: "CFBundleDisplayName")
    ?? bundle.object(forInfoDictionaryKey: kCFBundleNameKey as String),
    let stringName = name as? String
  {
    return stringName
  }
  let bundleURL = bundle.bundleURL
  let filename = bundleURL.lastPathComponent
  return stripFileExtension(filename)
}
extension UIApplication {
  static var appVersion: String? {
    return Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
  }
}
func appInfoString() -> String {
  var vers = " version "
  let name = nameOfApp()
  let version = UIApplication.appVersion
  if name.count + version!.count > 15 { vers = " vs "}
  
  return name + vers + version!
}
func copyRightString() -> String {
  
  let date = Date()
  let calendar = Calendar.current
  let year = String(calendar.component(.year, from: date))
  
  return "© " + year + " all rights reserved. "
}
extension UIButton {
  func twoLinesAppInfo() {
    let row1 = appInfoString()
    let row2 = copyRightString()
    let unformatted = row1 + "\n" + row2
    self.titleLabel?.numberOfLines = 0
    let str = NSMutableAttributedString(string: unformatted)
    
    str.addAttribute(NSAttributedString.Key.foregroundColor,
                     value: self.complementary(nil),
                     range:NSMakeRange(0, unformatted.count))
    
    str.addAttribute(NSAttributedString.Key.font,
                     value:UIFont.systemFont(ofSize: 13),
                     range:NSMakeRange(0, row1.count))
    str.addAttribute(NSAttributedString.Key.font,
                     value:UIFont.systemFont(ofSize: 12),
                     range:NSMakeRange(row1.count, unformatted.count - row1.count))
    self.setAttributedTitle(str, for: .normal)
    
  }}

extension VC {
  
  //  @IBAction func shareButtonClicked(sender: AnyObject)
  @objc func shareButtonClicked(sender: AnyObject) {
    //     let junk = 1
    //Set the default sharing message.
    let message = "Message goes here."
    //Set the link to share.
    if let link = NSURL(string: "http://yoururl.com")
    {
      let objectsToShare = [message,link] as [Any]
      let activityVC = UIActivityViewController(activityItems: objectsToShare, applicationActivities: nil)
      activityVC.excludedActivityTypes = [UIActivity.ActivityType.airDrop, UIActivity.ActivityType.addToReadingList]
      self.present(activityVC, animated: true, completion: nil)
    }
  }
}

extension UIView {
  func buttonsAdd(
    names: [String],
    andIndexed base: G0base) -> [UIButton] {
    
    var arr:[UIButton] = []
    for (i,name) in names.enumerated() {
      var name7  = name
      let b = UIButton()
      self.addSubview(b) // for auto(color
//      b.setTitleColor(b.auto(color: nil), for: [] )
      b.setTitleColor(b.complementary(nil), for: [] )
      
      
      if name.contains("\n\n") { // show more than one line
        name7 = name.replacingOccurrences(of: "\n\n", with: "\n")
        b.titleLabel!.lineBreakMode = .byWordWrapping
      }
      
      //      let showLinks = false
      //      if showLinks {
      //        b.titleLabel!.lineBreakMode = .byWordWrapping
      //      }
      
      b.setTitle(name7 , for: .normal )
      b.tag = base.rawValue + i + 1
      
      b.sizeToFit()
      if name.contains("©") {
        b.twoLinesAppInfo() // defeats autocolor
      }
      b.sizeToFit()
      arr.append(b)
    }
    return arr
  }
}
extension UIView {
  func u5buttonsAdd(
    names:[U5EnumTitleBB],
    andIndexed base: G0base) -> [UIButton] {
    
    var arr:[UIButton] = []
    for (i,name) in names.enumerated() {
      let b = U5erButton(frame: .zero,
                         text: name.rawValue)
      print("u5name.rv ==", name.rawValue)
      
//      b.setTitleColor(b.complementary(nil), for: [] )
      
      
      b.tag = base.rawValue + i + 1
      b.setTitle( name.rawValue , for: .normal )
      //            b.titleLabel?.font =
      //                UIFont(name:"TrajanPro-Regular",
      //                       size: fnt.szU5)!
      //FIXME: addFont tempfix
      b.titleLabel?.font =
        UIFont.systemFont(ofSize: FontSize.u5setting)
      
      b.sizeToFit()
      arr.append(b)
      addSubview(b)
    }
    
    return arr
  }
}
extension ViewController {
  
  func populateMenus1bb() -> Int {
    
    let popArr = MainMenuTitlesBB.allValues
    //        popArr.append(appInfoString())
    //        popArr.append(copyRightString())
    
//    popArr.append("©")
    
    popButtonsBB =
      mainMenuSlat.buttonsAdd(names: popArr, andIndexed: .menu)
    mainMenuSlat.buttonsArrangeChecking(base: .menu)
    
    for b in popButtonsBB {
      b.addTarget(self, action: #selector( /// =================>
        popButtonClicked(sndr: )), for: .touchUpInside)
    }
    return popButtonsBB.count
  }
  func populateMenusSettings() -> Int {
    
    let setArr = setNamesBB
    
    setButtonsBB =
      settingMenuSlat.u5buttonsAdd(names: setArr, andIndexed: .setting)
    
    settingMenuSlat.buttonsArrangeChecking(base: .setting)
    
    for b in setButtonsBB {
      b.addTarget(self, action: #selector( /// =================>
        u5setButtonClicked(sndr: )), for: .touchUpInside)
    }
    return setButtonsBB.count
  }
}
extension UIView {
  func subviewsAdd(_ quant: Int, andIndexed base: Int) {
    for n in 1...quant {
      let v = UIView()
      v.tag = base + n + 0
      addSubview(v)
      v.backgroundColor = .black
      v.isUserInteractionEnabled = false
    }
  }
  fileprivate
  func subviewsArrangeChecking(baseTag:Int) {
    var i:CGFloat = 0
    //        let btns = buttonSubviews()
    let quant = CGFloat(subviews.count)
    let heightUsed = frame.height * 0.3888
    let drop:CGFloat = 2.0 + 1.0
    let topMargin = (frame.height - heightUsed) / drop
    // set drop less than 2.0 to lower the buttons
    let lineHeight = heightUsed / (quant * 5.555)
    
    let cx = frame.width/2.0 // center
    
    for sv in subviews {
      
      if sv.tag < 0 { continue } // underlay
      
      i += 1
      let cy = heightUsed * i/quant + topMargin
      
      sv.frame.size.width = heightUsed / 1.111
      sv.frame.size.height = lineHeight
      //            sv.backgroundColor = csetrr.btnsFG
      
      sv.center = CGPoint(x: cx, y: cy)
      
      print("istg",sv.tag, "cktg",baseTag + Int(i))
      //FIXME:            assert(sv.tag == baseTag + Int(i))
    }
  }
}
// David Lane on Twitter: "Two-line hamburger menu icon on the ...
// https://twitter.com/dvdln/status/509676752235671552?lang=en
// https://pbs.twimg.com/media/BxK8TYsCMAA4KLm.png:large
extension UIButton {
  func hamburger(quant: Int) {
    
    strechCustomWood(.wgBurger, cornered: 2.0) // make round
    self.backgroundColor = CCBLU.brownSugar.__uiColor() // overrides woodgrain

    for sv in subviews {
      sv.removeFromSuperview()
    }
    var q7 = quant
    //    q7 /= 2 // overrideQuant for twoLines
    q7 = 2
    
    self.subviewsAdd(q7, andIndexed: G0base.grab.rawValue)
    self.subviewsArrangeChecking(baseTag: G0base.grab.rawValue)
  }
}
