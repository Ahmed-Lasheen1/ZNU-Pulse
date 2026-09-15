import { useEffect, useId, useState } from 'react'

// Vector ECG artwork — real vector, no raster PNG/WEBP + mask.
//
// AUDIT FIX (seam artifact): the STATIC base line below used to be drawn
// with <path stroke=... />, i.e. the browser stroked the raw multi-curve
// centerline live. With 20+ chained cubic-bezier segments meeting at
// cusps (the ECG's own peaks/troughs), the browser's stroker tessellates
// each segment's offset outline somewhat independently, and at those
// joins the anti-aliased edges don't always weld pixel-perfectly — this
// showed up as faint hairline "scratches" through the fill, as if it
// wasn't fully opaque there. It's an artifact of live-stroking this
// specific path shape, not a color/opacity bug.
//
// The fix: PULSE_FILL_PATH below is NOT the centerline — it's the
// pre-computed, single, CLOSED outline of the stroke itself (the
// centerline offset by +/-12.5 units with round joins/caps baked in as
// real geometry), generated once from the exact uploaded path via a
// small offset-polygon script (flatten each cubic bezier, offset every
// edge by the half stroke-width along its normal, insert a round-join
// arc at every convex turn beyond ~9 degrees, cap both ends with a
// semicircle). Rendered with `fill`, it's a single scanline-filled
// region with only ONE anti-aliased boundary (the true outer silhouette)
// — there's no second stroked segment to seam against, so the artifact
// can't occur.
//
// The animated centerline (PULSE_CENTERLINE) is kept separately and
// still used with `stroke`/`stroke-dasharray` for the shadow and the
// traveling beam — dasharray only works on strokes, and both of those
// layers go through a Gaussian blur anyway, which already hides any
// seam completely. Only the crisp, fully-opaque, always-fully-visible
// base line needed the fill treatment.
const PULSE_VIEWBOX = '115 165 825 575'

const PULSE_CENTERLINE = `M131 535
  C165 535 184 538 202 531
  C218 524 223 493 239 488
  C255 482 268 514 282 548
  C293 576 307 578 318 557
  C330 534 338 474 349 438
  C355 417 366 419 372 441
  C379 465 378 498 391 522
  C402 540 415 526 425 550
  C437 575 441 616 451 620
  C463 626 468 594 470 568
  L516 196
  C518 181 534 177 537 195
  L607 700
  C609 719 625 721 631 701
  L665 577
  C670 558 684 548 697 558
  C713 569 725 568 731 547
  C738 522 738 487 750 469
  C761 453 773 463 781 480
  C794 507 795 527 812 535
  C831 545 843 526 861 529
  C878 532 889 536 910 535`

const PULSE_FILL_PATH = "M130.9 547.5 L140.59 547.58 L149.43 547.75 L157.65 547.96 L165.36 548.11 L172.47 548.12 L172.87 548.12 L179.39 547.93 L180.0 547.89 L186.13 547.41 L186.95 547.32 L192.77 546.47 L193.78 546.28 L199.37 544.99 L200.51 544.67 L205.95 542.86 L208.56 541.64 L213.05 538.87 L215.27 537.13 L219.23 533.22 L220.45 531.83 L224.02 527.08 L224.63 526.19 L227.93 520.9 L228.17 520.5 L231.33 515.0 L234.49 509.55 L234.17 510.07 L237.47 504.96 L236.73 505.99 L240.3 501.54 L239.58 502.35 L238.8 503.1 L242.77 499.61 L241.48 500.61 L240.07 501.43 L244.56 499.2 L242.74 499.93 L240.83 500.37 L245.54 499.67 L242.81 499.77 L240.12 499.28 L244.68 500.64 L242.72 499.87 L240.92 498.78 L245.35 502.0 L244.31 501.15 L243.36 500.2 L247.68 505.05 L246.66 503.74 L250.89 510.0 L250.34 509.1 L254.51 516.57 L254.2 515.96 L258.34 524.41 L258.15 524.02 L262.23 533.12 L266.29 542.72 L270.51 552.92 L273.96 560.69 L274.57 561.9 L278.1 567.98 L279.14 569.5 L282.78 574.06 L284.61 575.91 L288.31 578.96 L291.44 580.85 L295.18 582.41 L299.69 583.37 L303.43 583.46 L308.05 582.7 L311.75 581.35 L315.07 579.52 L318.7 576.73 L320.67 574.85 L324.2 570.64 L325.32 569.07 L328.7 563.46 L329.45 562.02 L332.93 554.07 L333.34 553.03 L336.63 543.22 L336.82 542.59 L339.95 531.3 L340.05 530.91 L343.1 518.39 L346.08 505.05 L349.01 491.45 L351.93 477.92 L354.87 464.86 L357.92 452.44 L357.82 452.84 L361.03 441.38 L360.81 442.08 L362.75 436.47 L362.06 438.09 L364.24 433.84 L363.59 434.96 L362.82 436.01 L365.18 433.11 L363.8 434.56 L362.2 435.77 L364.68 434.19 L362.1 435.44 L359.3 436.08 L361.84 435.8 L358.79 435.76 L355.85 434.98 L358.39 436.0 L356.37 434.96 L354.56 433.58 L357.04 435.87 L356.01 434.8 L355.12 433.61 L357.48 437.15 L356.96 436.3 L356.51 435.41 L358.69 440.19 L358.17 438.85 L360.11 444.85 L359.88 444.06 L361.76 451.51 L361.61 450.84 L363.15 458.72 L363.07 458.32 L364.38 466.44 L365.6 474.8 L366.91 483.48 L368.39 492.14 L368.48 492.61 L370.25 501.03 L370.42 501.72 L372.64 509.92 L372.92 510.84 L375.72 518.72 L376.18 519.86 L379.69 527.32 L380.97 529.46 L384.33 533.97 L386.13 535.92 L389.58 538.93 L391.77 540.47 L395.28 542.4 L397.08 543.21 L400.61 544.48 L401.34 544.72 L404.88 545.75 L404.3 545.57 L407.8 546.78 L406.07 546.03 L409.51 547.84 L408.35 547.14 L407.27 546.32 L410.62 549.15 L409.61 548.2 L408.72 547.15 L411.95 551.42 L411.31 550.48 L410.75 549.49 L413.83 555.62 L413.5 554.9 L416.87 562.82 L416.57 562.03 L419.54 570.6 L419.38 570.09 L422.0 578.84 L424.39 587.55 L426.69 596.18 L428.95 604.21 L429.09 604.66 L431.34 611.67 L431.68 612.6 L434.05 618.35 L434.96 620.13 L437.52 624.29 L440.38 627.52 L443.21 629.78 L448.46 632.24 L451.86 632.94 L459.41 632.16 L462.4 630.84 L466.88 627.53 L469.51 624.46 L471.2 621.92 L473.47 617.37 L474.14 615.78 L476.09 610.01 L476.39 608.98 L478.04 602.24 L478.19 601.54 L479.57 594.11 L479.66 593.6 L480.78 585.74 L480.83 585.36 L481.74 577.17 L482.45 569.09 L482.41 569.53 L528.41 197.53 L528.16 198.9 L529.15 194.74 L528.76 196.05 L528.23 197.31 L529.9 193.88 L529.17 195.18 L528.29 196.38 L530.48 193.74 L529.33 194.95 L528.03 196.0 L530.57 194.22 L528.92 195.19 L527.14 195.91 L529.87 195.05 L527.73 195.52 L525.53 195.61 L528.3 195.74 L525.97 195.41 L523.75 194.65 L526.38 195.84 L524.44 194.75 L522.73 193.33 L525.07 195.64 L523.85 194.24 L522.85 192.67 L524.73 196.17 L524.11 194.85 L523.66 193.46 L524.92 198.21 L524.62 196.72 L594.62 701.72 L594.72 702.36 L595.72 707.54 L596.43 709.92 L598.12 714.05 L599.61 716.72 L601.86 719.77 L604.54 722.45 L607.19 724.4 L611.26 726.37 L614.17 727.17 L618.99 727.54 L622.03 727.17 L626.3 725.85 L629.31 724.29 L632.31 722.11 L635.15 719.32 L636.99 717.02 L639.53 712.97 L640.58 710.87 L642.65 705.53 L643.06 704.31 L677.06 580.31 L676.89 580.86 L678.65 575.44 L678.09 576.86 L680.33 572.04 L679.52 573.52 L682.18 569.38 L681.01 570.92 L684.03 567.52 L683.24 568.33 L682.39 569.07 L685.71 566.47 L684.62 567.23 L683.46 567.87 L687.02 566.14 L685.62 566.72 L684.15 567.12 L687.89 566.33 L686.27 566.57 L684.62 566.58 L688.48 566.79 L686.87 566.6 L685.29 566.2 L689.21 567.47 L687.83 566.93 L686.53 566.24 L690.41 568.62 L695.04 571.52 L696.19 572.16 L700.61 574.33 L702.25 574.99 L706.41 576.34 L708.72 576.85 L712.61 577.33 L715.63 577.34 L719.23 576.91 L722.6 576.02 L725.9 574.63 L728.87 572.86 L731.86 570.47 L733.93 568.35 L736.59 564.9 L737.83 562.95 L740.16 558.39 L740.83 556.8 L742.81 551.09 L743.14 549.98 L745.05 542.21 L745.18 541.62 L746.78 533.41 L746.84 533.07 L748.26 524.51 L749.6 515.87 L750.95 507.48 L752.44 499.27 L752.34 499.76 L754.13 491.79 L753.93 492.55 L756.09 485.11 L755.72 486.2 L758.37 479.46 L757.68 480.94 L760.93 475.06 L760.34 476.03 L759.65 476.94 L762.98 472.91 L762.03 473.93 L760.97 474.85 L764.32 472.26 L762.77 473.28 L761.08 474.07 L764.43 472.81 L762.35 473.39 L760.2 473.61 L763.52 473.56 L761.48 473.42 L759.5 472.95 L762.76 474.01 L761.26 473.41 L759.84 472.62 L763.02 474.68 L762.05 473.98 L761.15 473.2 L764.21 476.13 L763.03 474.84 L765.94 478.53 L765.18 477.44 L767.9 481.78 L767.38 480.86 L769.89 485.73 L769.61 485.15 L773.18 493.04 L772.98 492.58 L775.95 499.88 L778.52 506.68 L780.98 513.24 L783.4 519.28 L783.67 519.91 L786.16 525.24 L786.7 526.28 L789.48 531.02 L790.44 532.43 L793.67 536.53 L795.17 538.12 L799.02 541.57 L800.98 543.0 L805.63 545.75 L807.39 546.62 L812.9 548.8 L815.71 549.55 L820.87 550.3 L823.63 550.39 L828.53 550.01 L830.65 549.66 L835.36 548.46 L836.65 548.05 L841.25 546.34 L841.73 546.14 L846.18 544.26 L850.68 542.48 L849.68 542.83 L854.42 541.4 L852.62 541.8 L857.57 541.08 L856.33 541.2 L855.07 541.19 L860.31 541.48 L858.7 541.29 L863.54 542.19 L868.09 543.12 L872.61 544.06 L877.21 544.97 L881.78 545.8 L882.15 545.86 L886.73 546.55 L887.21 546.61 L892.0 547.14 L892.55 547.19 L897.65 547.52 L898.23 547.55 L903.74 547.65 L904.31 547.65 L910.32 547.5 L910.32 547.5 L915.08 546.42 L919.06 543.61 L921.67 539.48 L922.5 534.68 L921.42 529.92 L918.61 525.94 L914.48 523.33 L909.68 522.5 L909.68 522.5 L903.66 522.66 L904.23 522.66 L898.72 522.55 L899.29 522.57 L894.19 522.24 L894.74 522.29 L889.95 521.76 L890.42 521.82 L885.85 521.14 L886.22 521.2 L881.88 520.42 L877.61 519.56 L873.12 518.63 L868.33 517.66 L863.3 516.71 L861.69 516.52 L856.46 516.23 L853.96 516.34 L849.01 517.06 L847.21 517.46 L842.46 518.89 L841.46 519.24 L836.71 521.13 L832.02 523.11 L832.5 522.91 L827.9 524.63 L829.18 524.23 L824.47 525.44 L825.52 525.21 L826.59 525.08 L821.69 525.47 L823.08 525.43 L824.45 525.56 L819.29 524.81 L820.72 525.1 L822.11 525.56 L816.61 523.38 L817.51 523.78 L818.37 524.25 L813.73 521.49 L814.74 522.16 L815.68 522.92 L811.82 519.48 L812.61 520.24 L813.32 521.07 L810.09 516.96 L811.05 518.37 L808.27 513.64 L808.82 514.68 L806.33 509.34 L806.6 509.97 L804.29 504.2 L801.91 497.87 L799.22 490.76 L796.15 483.19 L795.96 482.73 L792.39 474.85 L792.11 474.27 L789.59 469.39 L789.07 468.48 L786.34 464.14 L785.58 463.06 L782.68 459.37 L781.5 458.08 L778.45 455.15 L776.58 453.68 L773.41 451.63 L770.49 450.24 L767.22 449.18 L763.2 448.57 L759.87 448.61 L755.64 449.41 L752.28 450.67 L749.04 452.48 L745.68 455.07 L743.67 457.02 L740.35 461.06 L739.07 462.94 L735.81 468.83 L735.11 470.31 L732.46 477.05 L732.08 478.14 L729.92 485.57 L729.73 486.33 L727.95 494.3 L727.85 494.79 L726.3 503.27 L724.91 511.98 L723.58 520.55 L722.18 528.97 L722.24 528.62 L720.64 536.83 L720.77 536.25 L718.86 544.02 L719.19 542.91 L717.21 548.62 L717.89 547.02 L715.56 551.58 L716.14 550.58 L716.8 549.63 L714.14 553.08 L715.11 551.96 L716.21 550.97 L713.22 553.36 L714.65 552.37 L716.2 551.59 L712.9 552.98 L714.56 552.41 L716.27 552.09 L712.68 552.52 L714.19 552.43 L715.7 552.52 L711.81 552.04 L712.98 552.24 L714.12 552.55 L709.96 551.2 L711.59 551.87 L707.17 549.7 L708.32 550.34 L703.59 547.38 L699.63 544.94 L696.95 543.7 L693.03 542.43 L689.84 541.83 L685.98 541.62 L682.71 541.87 L678.97 542.67 L676.1 543.65 L672.54 545.38 L670.29 546.78 L666.97 549.38 L665.33 550.93 L662.31 554.33 L661.14 555.87 L658.48 560.01 L657.67 561.49 L655.43 566.31 L654.87 567.72 L653.11 573.14 L652.94 573.69 L618.94 697.69 L619.35 696.47 L617.27 701.82 L617.75 700.75 L618.32 699.72 L615.79 703.78 L616.64 702.58 L617.63 701.48 L614.79 704.28 L616.2 703.08 L617.78 702.1 L614.77 703.67 L616.85 702.82 L619.04 702.35 L616.01 702.71 L618.43 702.66 L620.83 703.08 L617.91 702.27 L620.03 703.07 L621.98 704.24 L619.32 702.3 L620.77 703.53 L622.01 704.98 L619.76 701.92 L620.59 703.21 L621.26 704.59 L619.56 700.45 L619.98 701.62 L620.27 702.83 L619.28 697.64 L619.38 698.28 L549.38 193.28 L549.08 191.79 L547.82 187.04 L546.75 184.33 L544.86 180.83 L542.64 177.86 L540.3 175.55 L536.66 173.05 L534.03 171.86 L529.48 170.77 L526.72 170.64 L522.38 171.2 L519.64 172.06 L516.21 173.75 L513.67 175.53 L511.22 177.79 L509.04 180.44 L507.42 182.94 L505.75 186.37 L504.83 188.94 L503.84 193.1 L503.59 194.47 L457.59 566.47 L457.55 566.91 L456.87 574.7 L455.99 582.58 L456.03 582.2 L454.91 590.06 L454.99 589.55 L453.61 596.99 L453.76 596.28 L452.11 603.02 L452.41 601.99 L450.46 607.77 L451.12 606.18 L448.84 610.73 L449.61 609.41 L450.53 608.19 L447.9 611.26 L449.95 609.35 L452.38 607.94 L449.38 609.25 L453.1 608.27 L456.93 608.46 L453.54 607.76 L456.31 608.68 L458.79 610.22 L455.95 607.96 L457.52 609.46 L458.81 611.19 L456.26 607.04 L456.75 607.91 L457.17 608.82 L454.8 603.08 L455.14 604.01 L452.88 597.0 L453.02 597.45 L450.81 589.57 L448.52 581.02 L446.03 571.94 L443.33 562.91 L443.16 562.39 L440.18 553.82 L439.88 553.03 L436.5 545.1 L436.17 544.38 L433.08 538.25 L431.88 536.32 L428.64 532.05 L426.74 530.05 L423.38 527.22 L421.14 525.7 L417.69 523.89 L415.96 523.14 L412.45 521.93 L411.87 521.75 L408.34 520.72 L409.07 520.96 L405.53 519.69 L406.45 520.06 L407.33 520.5 L403.83 518.57 L404.97 519.28 L406.02 520.11 L402.58 517.1 L403.53 518.02 L404.38 519.05 L401.03 514.54 L401.72 515.58 L402.31 516.68 L398.81 509.23 L399.28 510.37 L396.49 502.49 L396.77 503.4 L394.55 495.2 L394.72 495.88 L392.94 487.46 L393.03 487.92 L391.59 479.52 L390.33 471.13 L389.09 462.65 L387.76 454.35 L387.69 453.95 L386.15 446.06 L386.0 445.39 L384.12 437.94 L383.89 437.15 L381.95 431.16 L381.43 429.82 L379.25 425.04 L378.28 423.29 L375.92 419.75 L374.0 417.5 L371.52 415.21 L367.69 412.79 L365.15 411.77 L359.16 410.95 L356.62 411.22 L351.24 413.11 L348.76 414.69 L345.78 417.35 L343.42 420.26 L342.0 422.43 L339.82 426.68 L339.13 428.3 L337.19 433.92 L336.97 434.62 L333.75 446.08 L333.64 446.48 L330.54 459.13 L327.51 472.54 L324.57 486.18 L321.67 499.7 L318.76 512.7 L315.76 525.0 L315.86 524.61 L312.73 535.91 L312.93 535.27 L309.64 545.07 L310.04 544.03 L306.55 551.98 L307.3 550.54 L303.91 556.15 L305.04 554.58 L301.51 558.79 L302.44 557.79 L303.47 556.9 L299.84 559.7 L301.42 558.66 L303.15 557.87 L299.44 559.23 L301.71 558.63 L304.05 558.47 L300.31 558.38 L302.61 558.65 L304.82 559.34 L301.07 557.78 L302.7 558.6 L304.2 559.66 L300.49 556.61 L301.45 557.49 L302.32 558.46 L298.68 553.91 L299.72 555.43 L296.2 549.35 L296.81 550.55 L293.49 543.08 L289.36 533.07 L285.15 523.14 L280.97 513.8 L280.79 513.41 L276.65 504.97 L276.33 504.36 L272.16 496.9 L271.61 496.0 L267.37 489.74 L266.35 488.42 L262.03 483.57 L260.05 481.78 L255.62 478.56 L251.87 476.7 L247.31 475.33 L241.89 474.94 L237.17 475.63 L233.44 476.8 L228.95 479.03 L226.25 480.85 L222.28 484.34 L220.79 485.9 L217.22 490.35 L216.48 491.38 L213.18 496.49 L212.86 497.01 L209.67 502.5 L206.49 508.06 L206.73 507.66 L203.42 512.95 L204.03 512.06 L200.46 516.81 L201.68 515.42 L197.71 519.33 L198.77 518.4 L199.93 517.59 L195.44 520.36 L196.71 519.67 L198.05 519.14 L192.61 520.95 L193.74 520.63 L188.15 521.92 L189.17 521.73 L183.35 522.58 L184.17 522.49 L178.05 522.97 L178.65 522.94 L172.13 523.13 L172.53 523.13 L165.63 523.11 L158.21 522.96 L149.99 522.76 L140.94 522.58 L131.1 522.5 L131.1 522.5 L126.31 523.41 L122.23 526.09 L119.49 530.13 L118.5 534.9 L119.41 539.69 L122.09 543.77 L126.13 546.51 L130.9 547.5 Z"

const LINE_COLOR = '#F4FBFF'
const BEAM_COLOR = '#5fd9ff'
const STROKE_WIDTH = 25

// Length of the traveling highlight, as a FRACTION of the path's total
// length. pathLength="1" (set on each animated <path> below) makes this
// fraction exact regardless of the path's real on-screen geometry.
//
// Deliberately generous — a short fraction reads as a moving dot once
// blurred, which is what made the previous version look like an "orb"
// chasing the line instead of a highlight traveling ALONG it. At 0.13
// the visible segment is long relative to the stroke width, so it
// unambiguously reads as a moving piece of line.
const BEAM_FRACTION = 0.13
const BEAM_DURATION = '7s'

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e) => setReduced(e.matches)
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])
  return reduced
}

export default function EcgHero({ height = 220 }) {
  const reduced = usePrefersReducedMotion()
  // Unique per mount so multiple EcgHero instances on the same page (or
  // hot-reload remounts) never collide on filter ids.
  const uid = useId()
  const shadowId = `ecgShadow-${uid}`
  const haloId = `pulseBeamHalo-${uid}`
  const glowId = `pulseBeamGlow-${uid}`

  return (
    <div style={{
      position: 'relative', width: '100%', height, maxHeight: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <style>{`
        @keyframes pulseHeroDash {
          0%   { stroke-dashoffset: ${1 + BEAM_FRACTION}; }
          100% { stroke-dashoffset: 0; }
        }
        .pulse-hero-beam {
          stroke-dasharray: ${BEAM_FRACTION} 1;
          animation: pulseHeroDash ${BEAM_DURATION} linear infinite;
        }
      `}</style>

      <svg
        viewBox={PULSE_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        width="100%" height="100%"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <filter id={shadowId} x="-30%" y="-30%" width="160%" height="170%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceAlpha" stdDeviation="13" result="blur" />
            <feOffset in="blur" dx="9" dy="17" result="offsetBlur" />
            <feColorMatrix
              in="offsetBlur" type="matrix"
              values="0 0 0 0 0.00
                      0 0 0 0 0.05
                      0 0 0 0 0.12
                      0 0 0 0.72 0"
              result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
            </feMerge>
          </filter>

          {!reduced && (
            <>
              <filter id={haloId} x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
              <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </>
          )}
        </defs>

        {/* Shadow — still a live stroke of the centerline: it's heavily
            blurred (stdDeviation 13), which fully absorbs any seam, and
            dasharray isn't needed here so there's no reason to use the
            heavier fill path for it. */}
        <path
          d={PULSE_CENTERLINE}
          fill="none"
          stroke="#081D3D"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${shadowId})`}
        />

        {/* Base line — pre-computed single filled outline (see comment at
            top of file). No stroke at all, so there is no live-stroking
            seam artifact possible. */}
        <path d={PULSE_FILL_PATH} fill={LINE_COLOR} fillRule="nonzero" />

        {/* Traveling highlight — kept as a stroked centerline (needs
            dasharray) but always blurred, so any seam is invisible. Not
            rendered under prefers-reduced-motion. */}
        {!reduced && (
          <>
            <path
              className="pulse-hero-beam"
              pathLength="1"
              d={PULSE_CENTERLINE}
              fill="none"
              stroke={BEAM_COLOR}
              strokeWidth={STROKE_WIDTH + 10}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.55"
              filter={`url(#${haloId})`}
            />
            <path
              className="pulse-hero-beam"
              pathLength="1"
              d={PULSE_CENTERLINE}
              fill="none"
              stroke={BEAM_COLOR}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#${glowId})`}
            />
          </>
        )}
      </svg>
    </div>
  )
}
