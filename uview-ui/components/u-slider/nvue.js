/**
 * 使用bindingx方案实现slider
 * 只能使用于nvue下
 */
// 引入bindingx，此库类似于微信小程序wxs，目的是让js运行在视图层，减少视图层和逻辑层的通信折损
const BindingX = uni.requireNativePlugin('bindingx')
// nvue操作dom的库，用于获取dom的尺寸信息
const dom = uni.requireNativePlugin('dom')
// nvue中用于操作元素动画的库，类似于uni.animation，只不过uni.animation不能用于nvue
const animation = uni.requireNativePlugin('animation')

export default {
	data() {
		return {
			// bindingx的回调值，用于取消绑定
			panEvent: null,
			// 标记是否移动状态
			moving: false,
			// 位移的偏移量
			x: 0,
			// 是否正在触摸过程中，用于标记动画类是否添加或移除
			touching: false,
			changeFromInside: false
		}
	},
	watch: {
		// 监听vlaue的变化，此变化可能是由于内部修改v-model的值，或者外部
		// 从服务端获取一个值后，赋值给slider的v-model而导致的
		value(n) {
			if (!this.changeFromInside) {
				this.initX()
			} else {
				this.changeFromInside = false
			}
		}
	},
	mounted() {
		this.init()
	},
	methods: {
		init() {
			// 更新滑块尺寸信息
			this.getSliderRect().then(size => {
				this.sliderRect = size
				this.initX()
			})
		},
		// 获取节点信息
		// 获取slider尺寸
		getSliderRect() {
			// 获取滑块条的尺寸信息
			// 通过nvue的dom模块，查询节点信息
			return new Promise(resolve => {
				this.$nextTick(() => {
					dom.getComponentRect(this.$refs['slider'], res => {
						resolve(res.size)
					})
				})
			})
		},
		// 初始化按钮位置
		initButtonStyle({
			barStyle,
			buttonWrapperStyle
		}) {
			this.barStyle = barStyle
			this.buttonWrapperStyle = buttonWrapperStyle
		},
		emitEvent(event, value) {
			this.$emit(event, value ? value : this.value)
		},
		formatStep(value) {
			// 移动点占总长度的百分比
			return Math.round(Math.max(this.min, Math.min(value, this.max)) / this.step) * this.step
		},
		// 滑动开始
		async onTouchStart(e) {
			console.log('start');
			// 阻止页面滚动，可以保证在滑动过程中，不让页面可以上下滚动，造成不好的体验
			e.stopPropagation && e.stopPropagation()
			e.preventDefault && e.preventDefault()
			// 更新滑块的尺寸信息
			this.sliderRect = await this.getSliderRect()
			// 标记滑动过程中触摸点的信息
			this.touchStart(e)
		},
		// 开始滑动
		onTouchMove(e) {
			if(this.moving) {
				return 
			}
			this.moving = true
			// 更新触摸点相关信息
			const touch = this.getTouchPoint(e)
			const {
				width,
				left
			} = this.sliderRect
			const value = ((touch.x - left) / width) * 100
			// console.log('touch', touch);
			let percent = 0
			if (this.step > 1) {
				// 如果step步进大于1，需要跳步，所以需要使用Math.round进行取整
				percent = Math.round(uni.$u.range(this.min, this.max, value) / this.step) * this.step
			} else {
				// 当step=1时，无需跳步，充分利用wxs性能，滑块实时跟随手势，达到丝滑的效果
				percent = uni.$u.range(this.min, this.max, value)
			}
			// console.log('percent', percent);
			const gapWidth = Math.round(percent / 100 * width)
			// console.log(touch.x, gapWidth);
			// 获取元素ref
			const button = this.$refs['nvue-button'].ref
			const gap = this.$refs['nvue-gap'].ref
			console.log('gapWidth', gapWidth);
			// console.log('touch', touch.x);
			animation.transition(button, {
				styles: {
					transform: `translateX(${gapWidth}px)`
				},
				duration: 0,
				needLayout: false,
				timingFunction: 'linear'
			}, () => {
				this.moving = false
			})
			// animation.transition(gap, {
			// 	styles: {
			// 		width: `${gapWidth}px`
			// 	},
			// 	duration: 0,
			// 	needLayout: false
			// }, () => {
			// 	this.moving = false
			// })
		},
		// 从value的变化，倒推得出x的值该为多少
		initX() {
			const {
				left,
				width
			} = this.sliderRect
			// 得出x的初始偏移值，之所以需要这么做，是因为在bindingX中，触摸滑动时，只能的值本次移动的偏移值
			// 而无法的值准确的前后移动的两个点的坐标值，weex纯粹为阿里巴巴的KPI(部门业绩考核)产物，也就这样了
			this.x = this.value / 100 * width
			// 设置移动的值
			const barStyle = {
				width: this.x + 'px'
			}
			// 按钮的初始值
			const buttonWrapperStyle = {
				transform: `translateX(${this.x - this.blockHeight / 2}px)`
			}
			this.initButtonStyle({
				barStyle,
				buttonWrapperStyle
			})
		}
	}
}
