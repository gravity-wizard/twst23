//
//  EdgeTextView.swift
//  two4
//
//  Created by G on 10/18/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import UIKit
// implement edgeViews is BaseVC
class EdgeTextView: UITextView {
    var dex = 0-1
//    var edgeName: EdgeName?
    init(index: Int) {
        super.init(frame: .zero, textContainer: nil)
        dex = index
        textAlignment = .center
        edgeTextViewStyle(String(dex))
    }
    required init?(coder: NSCoder) {
        fatalError("etv wrdimp")
    }
    func edgeTextViewStyle(_ txt: String) {
        text = txt
        textColor = .red
        backgroundColor = .clear
        font = UIFont.systemFont(ofSize: fnt.szET)
//        sizeToFit()
    }
} //TODO: edgeTextViews
extension ViewController {
    func bsAddEdgeTextViews(
        _ quanity: Int) -> [EdgeTextView] {
        var res: [EdgeTextView] = []
        for i in 0..<quanity {
            let etv = EdgeTextView(index: i) /// eb
          etv.tag = G0base.edgeText.rawValue + i + 1
            res.append(etv) /// ++++ etv
        }
        view.ySeperateViews(res)
        //        view.xSeperateLabels(res)
        if zck(.xtra) {
            self.view.addSubviews(res)
//            res.psArr([.tags])
        }
        return res
    }}
extension UIView {
    func eSeperateTextViews(arr: [EdgeTextView]) {
        var cgi: CGFloat = 0
        let gnt = CGFloat(arr.count) + 1
//        let xgap = frame.width/gnt
        let ygap = frame.height/1
        
        for e in arr {
            cgi += 1
            e.tag = G0base.edgeText.rawValue + Int(cgi)
            assert(e.setTagCG(i: cgi))
            
            e.tag -= 1 //FIXME: wrdTags butOK
//            i += 1
            e.text = String(e.tag)
            let xgap = cgi * frame.width/gnt
            
//            e.sizeToFit()
            
            e.frame.size.width = 200
            e.frame.size.height = 100
            
            e.center.x = xgap
            e.center.y = ygap
            //reverse halfHeight ofElement
            e.center.y -= e.frame.height/1.9
//            e.psVWa([.tags])
        }
//        arr.psArr([.tags])
        
    }}
//  etvs = bsAddEdgeTextViews(2)
//  view.eSeperateTextViews(arr: etvs)
