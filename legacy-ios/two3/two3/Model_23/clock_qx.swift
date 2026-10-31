//
//  Clock.swift
//  two4
//
//  Created by G on 11/13/19. mmAllYYYqqqmmwwddd
//  Copyright © 2019 akapps. All rights reserved.
//

import UIKit

enum YPOS {
  case above
  case below
  case decide
  case notset
}
class TimerButton: UIButton {
  override init(frame: CGRect = .zero) {
    super.init(frame: frame)
    titleLabel!.textColor = .white
    titleLabel!.textAlignment = .center
  }
  required init?(coder: NSCoder) {
    fatalError("tmrbtn wrdimp")
  }
  func assignTimerControl(target: ChildVC) {
    self.addTarget(
      target,
      action: #selector(
        target.toggleTimer0bjc(tndr:)),
      for: .touchUpInside)
  }
  func setText(tmcs: TMCSnm) {
    print("set tmcs", tmcs)
    setTitle(tmcs.rawValue, for: [])
  }
  func chkText(_ tmcs: TMCSnm) -> Bool {
    return titleLabel?.text == tmcs.rawValue
  }
}
// timeControlString
enum TMCSnm: String {
  case play   = "Play"
  case pause  = "Pause"
  case resume = "Resume"
}

func jdFromDate(date : NSDate) -> Double {
  let JD_JAN_1_1970_0000GMT = 2440587.5
  return JD_JAN_1_1970_0000GMT + date.timeIntervalSince1970 / 86400
}

func dateFromJd(jd : Double) -> NSDate {
  let JD_JAN_1_1970_0000GMT = 2440587.5
  return  NSDate(timeIntervalSince1970: (jd - JD_JAN_1_1970_0000GMT) * 86400)
}

enum ClockOperation {
  case zero
  case update
}
enum CounterOperation {
  case zero
  case update
}

extension Game {
  func gameClock(
    op: ClockOperation,
    to value: Double) -> Double {
    switch op {
      case .zero:     return 00.00
      case .update:   return value
    }}
  func gameCounter(
    op: CounterOperation,
    to value: Int) -> Int {
    switch op {
      case .zero:     return 00_00
      case .update:   return value
    }}
}
let g0tagStatView = 701921
// n0t-modulo %2==0
// https://rob.conery.io/2018/08/21/mod-and-remainder-are-not-the-same/
enum ShowStat: Int, CaseIterable {
  case moverBox       = 11_11 // do if odd 1111
  case timerBox       = 21_11 // skip even 2111
  
  case move_enum_skk  = 51_11
  case time_enum_skk  = 52_11
  
  case moverSlatNow   = 31_11
  case moverSlatBest  = 32_10
  case timerSlatNow   = 41_11
  case timerSlatBest  = 42_10
  
  func __bool() -> Bool {
    return rawValue % 2 == 1
  }}
/// convert rawValue_to_bool
class MoveStatView: StatView {
  func displayMove(text: String,
                   u: String = #function) {
    //    let u2 = #function; print(u2, text, u)
    self.text = text
    self.isHidden = ShowStat.move_enum_skk.__bool()
  }
}
class TimeStatView: StatView {
  func displayTime(text: String,
                   u: String = #function) {
    //    let u2 = #function; print(u2, text, u)
    self.text = text
    self.isHidden = ShowStat.time_enum_skk.__bool()
  }
}
class StatView: UILabel {
  required init?(coder: NSCoder) {
    fatalError("wrd StatView")
  }
  var abe = UILabel()
  var stub:   String?
  init(stub: String, on superView: UIView) {
    self.stub = stub
    abe.text  = stub
    
    abe.sizeToFit() // copyFrame
    super.init(frame: abe.frame)
    self.tag = g0tagStatView // primeIdentifier
    self.text = abe.text // init sizedToFit
  
    removeSiblingsFrom( superView )
    superView.addSubview(self) // prerecAC
    self.textColor = auto(color: nil)
    backgroundColor = superView.backgroundColor
  }
}
extension UIView {
  func removeSiblingsFrom(_ superView: UIView) {
    // remove other views of the same class
    for sv in superView.subviews {
      if sv.classForCoder != self.classForCoder { continue }
      gui(sv.classForCoder.description() + xt) // fixDupesOK
      sv.removeFromSuperview()
    }}
}
extension ChildVC {
  func show(stats: [ShowStat]) {
//    psGrid.moveView?.removeFromSuperview()
//    psGrid.timeView?.removeFromSuperview()
    for stat in stats {
      switch stat {
        case .moverBox: psGrid.moveView = showMover_taa(.moverBox)
        case .timerBox: psGrid.timeView = showTimer_taa(.timerBox)
        case .moverSlatNow:  break
        case .timerSlatNow:  break
        case .moverSlatBest: break
        case .timerSlatBest: break
        case .move_enum_skk: show_mover_skk(.moverBox)
        case .time_enum_skk: show_timer_skk(.timerBox)
      }
      psGrid.moveView?.isHidden = ShowStat.move_enum_skk.__bool()
      psGrid.timeView?.isHidden = ShowStat.time_enum_skk.__bool()
    }}
  func show_mover_skk(_ ss: ShowStat) {
    _ = showMover_taa(.moverBox) // new_method
    moverLabel_taa.isHidden = true // hide_old_method
    moverLabel_skk.center = psGrid.moveView!.center
    updateMover(to: gm.gameMove) // use_center_of_old_method
  }
  func showMover_taa(_ ss: ShowStat ) -> MoveStatView? {
    assert(ss == .moverBox)
    let u2 = #function; print(u2, ss, gm.gameName)
    if !ss.__bool() { return nil } // fixedDuplicates
    if self.psGrid.moveView != nil { return psGrid.moveView }
    
    let widthRatio: CGFloat = 0.033 // for mover
    let stvw = MoveStatView(stub: u2, on: psGrid.superview!.superview!)
    
    stvw.center.x = MSCP.x + psGrid.frame.width * widthRatio
    
    
    let yShift:CGFloat =
      gm is Game_X_ ? 3/4 : 3/2 // near top edge
    stvw.center.y -= stvw.frame.height * yShift
    
    return stvw
  }
  func show_timer_skk(_ ss: ShowStat) {
    _ = showTimer_taa(.timerBox) // new_method
    timerLabel_taa.isHidden = true // hide_old_method
    timerLabel_skk.center = psGrid.timeView!.center
    updateTimer(to: gm.gameTime) // use_center_of_old_method
  }
    func showTimer_taa(_ ss: ShowStat) -> TimeStatView? {
      assert(ss == .timerBox)
      let u2 = #function; print(u2, ss, gm.gameName) // 21_11
      if !ss.__bool() { return nil } // fixed_duplicates
      if self.psGrid.timeView != nil { return psGrid.timeView }
      
      let widthRatio: CGFloat = 0.42  // for timer
      let stvw = TimeStatView(stub: u2, on: psGrid.superview!.superview!)
      
      let cgVertical = CGFloat(gm.ecVertical)
      let cgHorizontal = CGFloat(gm.ecHorizontal)
      let xMult: CGFloat = cgHorizontal / cgVertical
      stvw.center.x = MSCP.x - psGrid.frame.width * widthRatio * xMult
    
      let yShift:CGFloat =
        gm is Game_X_ ? 3/4 : 3/2 // near top edge
      stvw.center.y -= stvw.frame.height * yShift

      return stvw
    }
}
extension ChildVC {
  func updateTimer(
    to value: Double,
    u: String = #function) {
    //    let u2 = #function; print(u2, value, u)
    gm.gameTime = gm.gameClock(op:.update, to: value)
    gm.timeText = timerLabel_taa.getStringFor(time: gm.gameTime)
    gm.timeTextAtt = timerLabel_taa.attibuted(timeText: gm.timeText)
    
    timerLabel_skk.center = psGrid.timeView!.center
//    timerLabel_skk.text = gm.timeText
    timerLabel_skk.attributedText = gm.timeTextAtt
    
    psGrid.timeView?.displayTime(text: gm.timeText) // nowHidden
    //    return Void()
    //    setNowStat(time: gm.gameTime,   timeText: gm.timeText)
  }
}
extension ChildVC {
  func zckRestart(_ dly: Double?, game: Game) {
    if updateSolution() { return }
    if zdelta != intMeansRepeat { return }
    let bgclr = view.backgroundColor
    
    let now = DispatchTime.now
    let wait: Double = dly ?? waitTime
    let when1 = now() + wait * 1.0 // correction
    let when2 = now() + wait * 1.1
    // delay
    DispatchQueue.main.asyncAfter(deadline: when1) {
      let timerReadBack = self.pauseTimer()
      print("trb", timerReadBack)
      self.view.backgroundColor = .red
    }
    DispatchQueue.main.asyncAfter(deadline: when2) {
      game.mixFig = game.mixFig0
      game.savedLLzArr = []
      self.view.backgroundColor = bgclr
      self.configurationDidChange()
    }
  }
}
extension ChildVC {
  func topLeftCenter(pivot: Pivot) -> U5Element {
    
    //    let timeZero32dg = "000.00" // setFrame
    let formattedTimeText
      = 13.timeText(ti: 987654321012345, leader: "Time: ")
    let clock = U5Label(formattedTimeText)
    let timeZero1dg_1dg = "0.0"
//    clockYposition = .below
    var timeBox = CGRect()
    timeBox.size = clock.frame.size
    clock.frame = timeBox
    clock.textColor = clock.auto(color: nil)

    clock.textAlignment = .right
    clock.text = timeZero1dg_1dg
    
    let spot = U5Element()
    spot.cp = clock.center
    spot.u5abe = clock
    
    return spot
  }
}
extension ChildVC {
  func show_timerLabel_skk() {
//    if !g0sShowTimer { return Void() }

    timerLabel_skk = topLeftCenter(pivot: psGrid).u5abe
    timerLabel_skk.name = gm.gameName
//    psGrid.alpha = gridAlpha
//    psGrid.backgroundColor = gridBGC
    
//    clockYposition = gm is Game_X_ ? .below : .above
    
    if clockYposition == .below {
      // grid width & height
      let gw = psGrid.frame.width
      let gh = psGrid.frame.height
      // timer width & height
      timerLabel_skk.bgc(.brown)
      let tw = timerLabel_skk.frame.width
      let th = timerLabel_skk.frame.height
      // timer coordinates
      let tx = gm is Game_X_ ? 0 + tw/4.0 : gw * 4.7/6.0
      let ty = gm is Game_X_ ? 0 + th/2.0 : gh * 1.0/6.0
      
      let bounds = UIScreen.main.bounds
      print("bounds", bounds)
      
      timerLabel_skk.center = CGPoint(x: tx, y: ty)
    }
    psGrid.addSubview(timerLabel_skk)
//    timerLab0ld.backgroundColor = .orange
    timerLabel_skk.textColor = timerLabel_skk.auto(color: nil)
//    timerLab0ld.setTitleColor(timerButton.auto(color: nil), for:[] )

  }
}
